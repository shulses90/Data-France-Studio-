import { GoogleGenAI, Type, FunctionDeclaration, Content, Part } from '@google/genai';
import { searchDatasets } from './api';
import Papa from 'papaparse';
import { logger } from './logger';

export interface ChartConfig {
  csvUrl: string;
  chartType: 'bar' | 'line';
  xAxisKey: string;
  yAxisKey: string;
  answer: string;
  filters?: Array<{ column: string; operator: 'eq' | 'contains' | 'gt' | 'lt'; value: string }>;
  aggregate?: 'sum' | 'avg' | 'count' | 'none';
  warning?: string;
}

const searchDatasetsTool: FunctionDeclaration = {
  name: 'search_datasets',
  description: 'Recherche des jeux de données sur data.gouv.fr à partir d\'une requête.',
  parameters: {
    type: Type.OBJECT,
    properties: { query: { type: Type.STRING, description: 'Mots-clés de recherche' } },
    required: ['query']
  }
};

const getCsvSampleTool: FunctionDeclaration = {
  name: 'get_csv_sample',
  description: 'Récupère un échantillon d\'un fichier CSV (en-têtes et 3 premières lignes) pour comprendre sa structure.',
  parameters: {
    type: Type.OBJECT,
    properties: { url: { type: Type.STRING, description: 'L\'URL du fichier CSV' } },
    required: ['url']
  }
};

const renderChartTool: FunctionDeclaration = {
  name: 'render_chart',
  description: 'Affiche le graphique. Tu peux demander au frontend de filtrer et agréger les données avant affichage.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      csvUrl: { type: Type.STRING, description: 'L\'URL du CSV à visualiser' },
      chartType: { type: Type.STRING, description: 'Type de graphique: "bar" ou "line"' },
      xAxisKey: { type: Type.STRING, description: 'Le nom EXACT de la colonne pour l\'axe X' },
      yAxisKey: { type: Type.STRING, description: 'Le nom EXACT de la colonne pour l\'axe Y' },
      answer: { type: Type.STRING, description: 'Une réponse textuelle courte et claire' },
      filters: {
        type: Type.ARRAY,
        description: '(Optionnel) Liste de filtres pour isoler les données pertinentes',
        items: {
          type: Type.OBJECT,
          properties: {
            column: { type: Type.STRING, description: 'Nom de la colonne à filtrer' },
            operator: { type: Type.STRING, description: 'Opérateur: "eq" (égal), "contains" (contient), "gt" (plus grand), "lt" (plus petit)' },
            value: { type: Type.STRING, description: 'Valeur du filtre' }
          },
          required: ['column', 'operator', 'value']
        }
      },
      aggregate: { type: Type.STRING, description: '(Optionnel) Agrégation sur l\'axe Y par rapport à l\'axe X: "sum", "avg", "count", ou "none"' },
      warning: { type: Type.STRING, description: '(Optionnel) Avertissement si le fichier est > 5Mo ou trop complexe. Explique le problème et propose une requête alternative.' }
    },
    required: ['csvUrl', 'chartType', 'xAxisKey', 'yAxisKey', 'answer']
  }
};

async function fetchCsvSample(url: string): Promise<{ fileSizeMB: number | string; headers: string[]; rows: unknown[] }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'DataGouv-Explorer/1.0' },
  });
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);

  const contentLength = res.headers.get('content-length');
  const fileSizeMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : 'Inconnu';

  // Read only the first chunk (up to 64KB)
  const reader = res.body?.getReader();
  let text = '';
  if (reader) {
    const { value } = await reader.read();
    if (value) {
      text = new TextDecoder().decode(value);
    }
    reader.cancel();
  } else {
    text = await res.text();
  }

  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return {
    fileSizeMB: fileSizeMB !== 'Inconnu' ? Number(fileSizeMB) : 'Inconnu',
    headers: parsed.meta?.fields || [],
    rows: parsed.data.slice(0, 10)
  };
}

export async function askDataGouvAI(
  question: string,
  onProgress: (msg: string) => void
): Promise<ChartConfig | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé API Gemini manquante. Configurez GEMINI_API_KEY dans les variables d'environnement.");

  const ai = new GoogleGenAI({ apiKey });

  const contents: Content[] = [
    { role: 'user', parts: [{ text: question }] }
  ];

  let isDone = false;
  let chartConfig: ChartConfig | null = null;
  let iterations = 0;
  let debugLog = '';

  while (!isDone && iterations < 8) {
    iterations++;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction: "Tu es un expert data analyst français. Ton but est de répondre à la question en visualisant des données de data.gouv.fr.\n1. Utilise search_datasets.\n2. Utilise get_csv_sample pour voir les colonnes ET la taille du fichier.\n3. Appelle render_chart.\nATTENTION: Le frontend ne lit que les 5 premiers Mo du fichier. Si get_csv_sample t'indique un fichier > 5 Mo, ou si les données sont trop complexes (ex: pas de colonnes numériques claires), tu DOIS remplir le champ 'warning' pour alerter l'utilisateur que les données sont tronquées ou inexploitables, et lui proposer une requête plus précise. Utilise 'filters' (tableau d'objets) et 'aggregate' pour extraire du sens.",
          tools: [{ functionDeclarations: [searchDatasetsTool, getCsvSampleTool, renderChartTool] }],
          temperature: 0.1,
        }
      });

      if (response.candidates && response.candidates[0].content) {
        contents.push(response.candidates[0].content);
      }

      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
        const functionResponseParts: Part[] = [];

        for (const call of calls) {
          debugLog += `[Call: ${call.name} with ${JSON.stringify(call.args)}] `;
          if (call.name === 'render_chart') {
            onProgress("Génération de la visualisation...");
            chartConfig = call.args as unknown as ChartConfig;
            isDone = true;
            break;
          } else if (call.name === 'search_datasets') {
            const query = call.args?.query as string;
            onProgress(`Recherche de datasets pour "${query}"...`);
            try {
              const datasets = await searchDatasets(query);
              const simplified = (datasets || [])
                .filter(d => d.resources && d.resources.some(r => r.format && r.format.trim().toLowerCase() === 'csv'))
                .slice(0, 3)
                .map(d => ({
                  title: d.title,
                  csv_resources: d.resources.filter(r => r.format && r.format.trim().toLowerCase() === 'csv').map(r => ({ title: r.title, url: r.url }))
                }));

              debugLog += `-> Found ${simplified.length} datasets. `;
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { result: simplified } }
              });
            } catch (e: any) {
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { error: e.message } }
              });
            }
          } else if (call.name === 'get_csv_sample') {
            onProgress(`Analyse du fichier CSV...`);
            try {
              const url = call.args?.url as string;
              const sample = await fetchCsvSample(url);

              debugLog += `-> CSV headers: ${sample.headers.join(', ')}. `;
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { result: sample } }
              });
            } catch (e: any) {
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { error: e.message } }
              });
            }
          } else {
            debugLog += `-> Unknown function. `;
            functionResponseParts.push({
              functionResponse: { id: (call as any).id, name: call.name, response: { error: `Function ${call.name} not found` } }
            });
          }
        }

        if (!isDone && functionResponseParts.length > 0) {
          contents.push({
            role: 'user',
            parts: functionResponseParts
          });
        }
      } else {
        if (response.text) {
           chartConfig = {
             csvUrl: '', chartType: 'bar', xAxisKey: '', yAxisKey: '', answer: response.text
           };
        }
        isDone = true;
      }
    } catch (error: any) {
      logger.error("[ai] Gemini API Error:", error);
      throw new Error("Erreur de communication avec l'IA: " + error.message);
    }
  }

  if (!isDone && iterations >= 8) {
    return {
      csvUrl: '',
      chartType: 'bar',
      xAxisKey: '',
      yAxisKey: '',
      answer: `L'IA a pris trop de temps pour répondre. Debug: ${debugLog}`
    };
  }

  return chartConfig;
}

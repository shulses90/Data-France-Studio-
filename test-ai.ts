import { GoogleGenAI, Type, FunctionDeclaration, Content, Part } from '@google/genai';
import { searchDatasets } from './lib/api';
import Papa from 'papaparse';

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
  description: 'Affiche le graphique à l\'utilisateur avec les données analysées et fournit une réponse textuelle.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      csvUrl: { type: Type.STRING, description: 'L\'URL du CSV à visualiser' },
      chartType: { type: Type.STRING, description: 'Type de graphique: "bar" ou "line"' },
      xAxisKey: { type: Type.STRING, description: 'Le nom EXACT de la colonne pour l\'axe X (doit exister dans les en-têtes)' },
      yAxisKey: { type: Type.STRING, description: 'Le nom EXACT de la colonne pour l\'axe Y (doit être numérique et exister dans les en-têtes)' },
      answer: { type: Type.STRING, description: 'Une réponse textuelle courte et claire à la question de l\'utilisateur' }
    },
    required: ['csvUrl', 'chartType', 'xAxisKey', 'yAxisKey', 'answer']
  }
};

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const contents: Content[] = [
    { role: 'user', parts: [{ text: "Quelle est l'évolution des naissances ?" }] }
  ];

  let isDone = false;
  let iterations = 0;

  while (!isDone && iterations < 8) {
    iterations++;
    console.log(`\n--- Iteration ${iterations} ---`);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction: "Tu es un expert data analyst français. Ton but est de répondre à la question de l'utilisateur en visualisant des données de data.gouv.fr.\n1. Utilise search_datasets pour trouver des données.\n2. Utilise get_csv_sample sur l'URL d'un CSV prometteur pour voir ses colonnes.\n3. Appelle render_chart pour afficher le résultat. Tu DOIS utiliser EXACTEMENT les noms de colonnes renvoyés par get_csv_sample pour xAxisKey et yAxisKey. Si tu ne trouves rien après 2 recherches ou si le CSV est invalide, appelle render_chart avec des valeurs vides pour les axes et explique le problème dans 'answer'. Ne boucle pas indéfiniment.",
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
          console.log(`AI called: ${call.name} with args:`, call.args);
          if (call.name === 'render_chart') {
            console.log("DONE! Chart config:", call.args);
            isDone = true;
            break;
          } else if (call.name === 'search_datasets') {
            const query = call.args?.query as string;
            try {
              const datasets = await searchDatasets(query);
              const simplified = (datasets || [])
                .filter(d => d.resources && d.resources.some(r => r.format && r.format.toLowerCase() === 'csv'))
                .slice(0, 3)
                .map(d => ({
                  title: d.title,
                  csv_resources: d.resources.filter(r => r.format && r.format.toLowerCase() === 'csv').map(r => ({ title: r.title, url: r.url }))
                }));
              console.log("Search result length:", simplified.length);
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { result: simplified } }
              });
            } catch (e: any) {
              console.error("Search error:", e.message);
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { error: e.message } }
              });
            }
          } else if (call.name === 'get_csv_sample') {
            try {
              const url = call.args?.url as string;
              console.log("Fetching CSV:", url);
              const res = await fetch(url); // Direct fetch for testing
              if (!res.ok) throw new Error('Failed to fetch CSV: ' + res.status);
              const text = await res.text();
              
              const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
              const sample = {
                headers: parsed.meta?.fields || [],
                rows: parsed.data.slice(0, 3)
              };
              console.log("CSV Sample headers:", sample.headers);
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { result: sample } }
              });
            } catch (e: any) {
              console.error("CSV error:", e.message);
              functionResponseParts.push({
                functionResponse: { id: (call as any).id, name: call.name, response: { error: e.message } }
              });
            }
          } else {
            console.log("Unknown function:", call.name);
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
        console.log("AI returned text:", response.text);
        isDone = true;
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      break;
    }
  }

  if (!isDone && iterations >= 8) {
    console.error("L'IA a pris trop de temps pour répondre.");
  }
}

run();

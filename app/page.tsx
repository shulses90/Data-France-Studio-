'use client';

import { useState, useCallback } from 'react';
import { Search, Database, Loader2, Sparkles, Bot } from 'lucide-react';
import { searchDatasets, getDataset, Dataset, Resource } from '@/lib/api';
import { processData } from '@/lib/data-processing';
import { loadCsvFromProxy } from '@/lib/csv-loader';
import ChartVisualization from '@/components/chart-visualization';
import DatasetSidebar from '@/components/dataset-sidebar';
import EmptyState from '@/components/empty-state';

export default function Home() {
  const [query, setQuery] = useState('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [yAxisKey, setYAxisKey] = useState<string>('');

  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setCsvData([]);
    setSelectedDataset(null);
    setSelectedResource(null);
    setCsvError(null);
    setAiWarning(null);
  }, []);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);
    resetState();
    setAiProgress('Envoi de la question à l\'IA...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuery.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || `Erreur ${res.status}`);
      }

      const { config, progressMessages } = await res.json();

      // Show last progress message
      if (progressMessages?.length > 0) {
        setAiProgress(progressMessages[progressMessages.length - 1]);
      }

      if (config) {
        setAiAnswer(config.answer);
        setAiWarning(config.warning || null);
        if (config.csvUrl) {
          setChartType(config.chartType || 'bar');
          setXAxisKey(config.xAxisKey);
          setYAxisKey(config.yAxisKey);

          setSelectedResource({
            id: 'ai-generated',
            title: 'Données extraites par l\'IA',
            format: 'csv',
            url: config.csvUrl,
          });

          setCsvLoading(true);
          try {
            const { data, headers } = await loadCsvFromProxy(config.csvUrl);
            const processed = processData(
              data, config.filters, config.aggregate, config.xAxisKey, config.yAxisKey
            );
            setCsvData(processed.slice(0, 100));
            setCsvHeaders(headers);
          } catch (loadErr: any) {
            setCsvError(loadErr.message);
          } finally {
            setCsvLoading(false);
          }
        } else {
          setCsvError("L'IA n'a pas fourni de données à visualiser.");
        }
      } else {
        setCsvError("L'IA n'a pas pu générer de réponse.");
      }
    } catch (error: any) {
      console.error(error);
      setCsvError("Erreur lors de l'analyse IA: " + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    resetState();
    try {
      const results = await searchDatasets(query);
      setDatasets(results || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDataset = async (dataset: Dataset) => {
    setLoading(true);
    setSelectedResource(null);
    setCsvData([]);
    setCsvError(null);
    try {
      const fullDataset = await getDataset(dataset.id);
      setSelectedDataset(fullDataset);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResource = async (resource: Resource) => {
    setSelectedResource(resource);
    setCsvError(null);

    if (!resource.format || resource.format.trim().toLowerCase() !== 'csv') return;

    setCsvLoading(true);
    setCsvData([]);
    try {
      const { data, headers } = await loadCsvFromProxy(resource.url);
      const sliced = data.slice(0, 100);
      setCsvData(sliced);
      setCsvHeaders(headers);
      if (headers.length >= 2) {
        setXAxisKey(headers[0]);
        const numericField = headers.find(f => typeof (sliced[0] as any)?.[f] === 'number');
        setYAxisKey(numericField || headers[1]);
      } else if (headers.length >= 1) {
        setXAxisKey(headers[0]);
        setYAxisKey(headers[0]);
      }
    } catch (error: any) {
      setCsvError(error.message || 'Erreur lors du chargement du CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleQuickSearch = (term: string, results: Dataset[]) => {
    setQuery(term);
    setDatasets(results);
  };

  const showEmptyState = !selectedDataset && !loading && datasets.length === 0 && !query && !aiAnswer && !aiLoading;
  const showVisualization = selectedResource && selectedResource.format?.trim().toLowerCase() === 'csv';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* French flag bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-white to-red-600"></div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              DataGouv Explorer
              <span className="flex h-3.5 w-5 rounded-sm overflow-hidden border border-slate-200 shadow-sm" title="France">
                <span className="flex-1 bg-blue-600"></span>
                <span className="flex-1 bg-white"></span>
                <span className="flex-1 bg-red-600"></span>
              </span>
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Propulsé par Google AI Studio
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Search Section */}
        <div className="mb-8 space-y-6">
          {/* AI Search */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-red-500 rounded-3xl p-1 shadow-lg max-w-3xl mx-auto">
            <div className="bg-white rounded-[22px] p-2 flex items-center">
              <Sparkles className="w-6 h-6 text-blue-600 ml-3 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Demandez à l'IA (ex: Quelle est l'évolution des naissances ?)"
                className="flex-1 py-3 px-2 outline-none text-lg min-w-0"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                maxLength={500}
                aria-label="Question pour l'IA"
              />
              <button
                onClick={handleAiSearch}
                disabled={aiLoading || !aiQuery.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-2"
              >
                {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Bot className="w-5 h-5" /> Analyser</>}
              </button>
            </div>
          </div>

          <div className="relative max-w-2xl mx-auto flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">ou recherche manuelle</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des datasets (ex: logement, population)..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-shadow"
                aria-label="Recherche manuelle de datasets"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-3 px-4 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && !selectedDataset ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rechercher'}
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {datasets.length > 0 && (
            <DatasetSidebar
              datasets={datasets}
              selectedDataset={selectedDataset}
              selectedResource={selectedResource}
              onSelectDataset={handleSelectDataset}
              onSelectResource={handleSelectResource}
            />
          )}

          <div className={`space-y-6 ${datasets.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-blue-100 shadow-sm mb-8">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">L&apos;IA analyse votre demande...</h3>
                <p className="text-blue-600 font-medium">{aiProgress}</p>
              </div>
            )}

            {aiAnswer && !aiLoading && !showVisualization && (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 mb-6 flex gap-4 items-start">
                <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Réponse de l&apos;IA</h3>
                  <p className="text-blue-800 leading-relaxed">{aiAnswer}</p>
                </div>
              </div>
            )}

            {loading && selectedDataset && !selectedResource && (
              <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {showVisualization && (
              <ChartVisualization
                csvData={csvData}
                csvHeaders={csvHeaders}
                csvLoading={csvLoading}
                csvError={csvError}
                chartType={chartType}
                setChartType={setChartType}
                xAxisKey={xAxisKey}
                setXAxisKey={setXAxisKey}
                yAxisKey={yAxisKey}
                setYAxisKey={setYAxisKey}
                aiAnswer={aiAnswer}
                aiWarning={aiWarning}
                resourceTitle={selectedResource?.title || ''}
              />
            )}

            {showEmptyState && (
              <EmptyState onSearch={handleQuickSearch} setLoading={setLoading} />
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Données issues de <a href="https://www.data.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">data.gouv.fr</a>
          </p>
          <div className="text-sm text-slate-500 flex items-center gap-1 flex-wrap justify-center">
            Créé par <a href="https://www.linkedin.com/in/milton-thomas-architecteia/" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 transition-colors">Milton Thomas</a>
            <span className="mx-2 text-slate-300">&bull;</span>
            <a href="https://www.lecoledelaplume.com" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 transition-colors">L&apos;École de la Plume</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

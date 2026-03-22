'use client';

import { useState, useRef } from 'react';
import { Search, Database, FileText, BarChart3, Loader2, Download, ExternalLink, AlertCircle, Sparkles, Bot } from 'lucide-react';
import { searchDatasets, getDataset, Dataset, Resource } from '@/lib/api';
import { askDataGouvAI } from '@/lib/ai';
import Papa from 'papaparse';
import { processData } from '@/lib/data-processing';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

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

  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      try {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff', style: { transform: 'scale(1)' } });
        const link = document.createElement('a');
        link.download = 'infographie-datagouv.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to download image', err);
      }
    }
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);
    setCsvData([]);
    setSelectedDataset(null);
    setSelectedResource(null);
    setCsvError(null);
    
    try {
      const config = await askDataGouvAI(aiQuery, setAiProgress);
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
            url: config.csvUrl
          });
          
          setCsvLoading(true);
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(config.csvUrl)}`);
          if (!res.ok) throw new Error('Failed to fetch resource via proxy');
          
          // Read up to 5MB to get a better sample
          const reader = res.body?.getReader();
          let text = '';
          if (reader) {
            let bytesRead = 0;
            while (bytesRead < 5000000) { // Max 5MB
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                text += new TextDecoder().decode(value, { stream: true });
                bytesRead += value.length;
              }
            }
            reader.cancel();
          } else {
            text = await res.text();
          }
          
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors && results.errors.length > 0 && results.data.length === 0) {
                setCsvError('Failed to parse CSV data.');
                setCsvLoading(false);
                return;
              }
              
              let data = results.data;
              
              data = processData(
                data, 
                config.filters as any, 
                config.aggregate, 
                config.xAxisKey, 
                config.yAxisKey
              );
              
              setCsvData(data.slice(0, 100));
              setCsvHeaders(results.meta.fields || []);
              setCsvLoading(false);
            },
            error: (error: any) => {
              setCsvError(error.message);
              setCsvLoading(false);
            }
          });
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
    setSelectedDataset(null);
    setSelectedResource(null);
    setCsvData([]);
    setCsvError(null);
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
    
    if (resource.format && resource.format.trim().toLowerCase() === 'csv') {
      setCsvLoading(true);
      setCsvData([]);
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(resource.url)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch resource via proxy');
        }
        
        // Read up to 5MB to get a better sample
        const reader = res.body?.getReader();
        let text = '';
        if (reader) {
          let bytesRead = 0;
          while (bytesRead < 5000000) { // Max 5MB
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              text += new TextDecoder().decode(value, { stream: true });
              bytesRead += value.length;
            }
          }
          reader.cancel();
        } else {
          text = await res.text();
        }
        
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0 && results.data.length === 0) {
              setCsvError('Failed to parse CSV data.');
              setCsvLoading(false);
              return;
            }
            
            const data = results.data.slice(0, 100); // Limit to 100 rows for performance
            setCsvData(data);
            
            if (results.meta.fields && results.meta.fields.length > 0) {
              setCsvHeaders(results.meta.fields);
              if (results.meta.fields.length >= 2) {
                setXAxisKey(results.meta.fields[0]);
                // Try to find a numeric column for Y axis
                const numericField = results.meta.fields.find(f => typeof (data[0] as any)?.[f] === 'number');
                setYAxisKey(numericField || results.meta.fields[1]);
              } else {
                setXAxisKey(results.meta.fields[0]);
                setYAxisKey(results.meta.fields[0]);
              }
            }
            setCsvLoading(false);
          },
          error: (error: any) => {
            console.error(error);
            setCsvError(error.message);
            setCsvLoading(false);
          }
        });
      } catch (error: any) {
        console.error(error);
        setCsvError(error.message || 'Error loading CSV');
        setCsvLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
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
            <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">OU RECHERCHE MANUELLE</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher des datasets (e.g., 'logement', 'population')..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-shadow"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-3 px-4 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && !selectedDataset ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / List */}
          {datasets.length > 0 && (
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Results ({datasets.length})
                  </h2>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {datasets.map((dataset) => (
                    <button
                      key={dataset.id}
                      onClick={() => handleSelectDataset(dataset)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedDataset?.id === dataset.id
                          ? 'bg-blue-50 border-blue-100 border text-blue-900'
                          : 'hover:bg-slate-50 border border-transparent text-slate-700'
                      }`}
                    >
                      <h3 className="font-medium line-clamp-2 text-sm">{dataset.title}</h3>
                      {dataset.organization?.name && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {dataset.organization.name}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
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

            {aiAnswer && !aiLoading && (
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

            {selectedDataset && !loading && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedDataset.title}</h2>
                  {selectedDataset.organization?.name && (
                    <div className="text-sm font-medium text-blue-600 mb-4">
                      {selectedDataset.organization.name}
                    </div>
                  )}
                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                    {selectedDataset.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    Resources
                  </h3>
                  <div className="grid gap-3">
                    {selectedDataset.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className={`p-4 rounded-xl border transition-all ${
                          selectedResource?.id === resource.id
                            ? 'border-blue-300 bg-blue-50/30 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 text-sm truncate" title={resource.title}>
                              {resource.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wider">
                                {resource.format}
                              </span>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Download
                              </a>
                            </div>
                          </div>
                          {resource.format && resource.format.trim().toLowerCase() === 'csv' && (
                            <button
                              onClick={() => handleSelectResource(resource)}
                              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedResource?.id === resource.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {selectedResource?.id === resource.id ? 'Viewing' : 'Visualize'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedDataset.resources.length === 0 && (
                      <p className="text-sm text-slate-500 italic">No resources available for this dataset.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Visualization Area */}
            {selectedResource && selectedResource.format && selectedResource.format.trim().toLowerCase() === 'csv' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden" id="visualization">
                <div className="flex items-center justify-between p-6 lg:px-8 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Visualisation des données
                  </h3>
                  {csvData.length > 0 && (
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          chartType === 'bar' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          chartType === 'line' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Line
                      </button>
                    </div>
                  )}
                </div>

                <div ref={chartRef} className="p-6 lg:p-8 bg-white">
                  {aiAnswer && (
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
                        {aiAnswer}
                      </h3>
                      <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Source : {selectedResource.title}
                      </p>
                    </div>
                  )}

                  {aiWarning && (
                    <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-amber-600" />
                      <div className="text-sm font-medium leading-relaxed">
                        {aiWarning}
                      </div>
                    </div>
                  )}

                  {csvLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                      <p className="font-medium animate-pulse">Chargement et analyse des données...</p>
                    </div>
                  ) : csvError ? (
                    <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
                      <AlertCircle className="w-10 h-10 mb-3 text-red-500" />
                      <p className="font-semibold text-lg">Impossible de charger la visualisation</p>
                      <p className="text-sm mt-2 opacity-80 max-w-md">{csvError}</p>
                    </div>
                  ) : csvData.length > 0 ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100" data-html2canvas-ignore>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Axe X</label>
                          <select
                            value={xAxisKey}
                            onChange={(e) => setXAxisKey(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Axe Y</label>
                          <select
                            value={yAxisKey}
                            onChange={(e) => setYAxisKey(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            {csvHeaders.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="h-[400px] w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === 'bar' ? (
                            <BarChart data={csvData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey={xAxisKey} 
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                dy={10}
                              />
                              <YAxis 
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                cursor={{ fill: '#f8fafc' }}
                              />
                              <Bar dataKey={yAxisKey} fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={60} />
                            </BarChart>
                          ) : (
                            <LineChart data={csvData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey={xAxisKey} 
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                dy={10}
                              />
                              <YAxis 
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                              />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                              />
                              <Line type="monotone" dataKey={yAxisKey} stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="mt-8 flex items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-100 pt-6">
                        <span className="flex items-center gap-1.5"><Bot className="w-4 h-4" /> Généré par l'IA Data Analyst</span>
                        <span>data.gouv.fr</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      Aucune donnée disponible pour la visualisation.
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!csvLoading && !csvError && csvData.length > 0 && (
                  <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleDownloadImage}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Partager l'infographie
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Empty State */}
            {!selectedDataset && !loading && datasets.length === 0 && !query && !aiAnswer && !aiLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 max-w-3xl mx-auto">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                  <Database className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Explorez les données publiques françaises</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Une interface simple, élégante et accessible pour interroger, découvrir et visualiser les jeux de données de <strong>data.gouv.fr</strong>. 
                  <br className="hidden sm:block" />
                  Posez vos questions en langage naturel, et laissez l&apos;intelligence artificielle analyser les données pour vous.
                </p>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10 w-full text-left space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Comment ça marche ?
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Ce projet a été conçu avec <strong>Google AI Studio</strong> et le modèle <strong>Gemini 3 Flash</strong>. 
                      L&apos;IA agit comme un analyste de données : elle comprend votre question, recherche les bons fichiers CSV sur data.gouv.fr, 
                      les télécharge, analyse leurs colonnes et génère automatiquement la visualisation la plus pertinente pour vous répondre.
                    </p>
                  </div>
                  
                  <div className="pt-5 border-t border-slate-100">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      L&apos;inspiration : Le serveur MCP data.gouv.fr
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">
                      Cette interface s&apos;inscrit dans la continuité de l&apos;incroyable et généreuse initiative de l&apos;équipe data.gouv.fr. 
                      Ils ont récemment expérimenté la création d&apos;un <strong>serveur MCP (Model Context Protocol)</strong>, 
                      une technologie standardisée permettant aux intelligences artificielles de dialoguer directement et de façon fluide avec le catalogue de données publiques.
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      Un immense merci à eux pour cette démarche d&apos;ouverture (open data) qui rend possible la création d&apos;outils d&apos;exploration innovants comme celui-ci !
                    </p>
                    <a 
                      href="https://www.data.gouv.fr/posts/experimentation-autour-dun-serveur-mcp-pour-datagouv" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Lire leur article sur l&apos;expérimentation MCP <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {['Elections', 'Logement', 'Transports', 'Environnement'].map(term => (
                    <button
                      key={term}
                      onClick={(e) => {
                        e.preventDefault();
                        setQuery(term);
                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                        setLoading(true);
                        searchDatasets(term).then(results => {
                          setDatasets(results || []);
                          setLoading(false);
                        }).catch(err => {
                          console.error(err);
                          setLoading(false);
                        });
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Données issues de <a href="https://www.data.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">data.gouv.fr</a>
          </p>
          <div className="text-sm text-slate-500 flex items-center gap-1 flex-wrap justify-center">
            Créé par <a href="https://www.linkedin.com/in/milton-thomas-architecteia/" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 transition-colors">Milton Thomas</a>
            <span className="mx-2 text-slate-300">•</span>
            <a href="https://www.lecoledelaplume.com" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-900 hover:text-blue-600 transition-colors">L&apos;École de la Plume</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

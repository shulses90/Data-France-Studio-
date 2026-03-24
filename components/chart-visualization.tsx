'use client';

import { useRef } from 'react';
import { BarChart3, Download, Bot, Database, AlertCircle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface ChartVisualizationProps {
  csvData: any[];
  csvHeaders: string[];
  csvLoading: boolean;
  csvError: string | null;
  chartType: 'bar' | 'line';
  setChartType: (type: 'bar' | 'line') => void;
  xAxisKey: string;
  setXAxisKey: (key: string) => void;
  yAxisKey: string;
  setYAxisKey: (key: string) => void;
  aiAnswer: string | null;
  aiWarning: string | null;
  resourceTitle: string;
}

const axisStyle = { fontSize: 12, fill: '#64748b', fontWeight: 500 };
const tooltipStyle = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  padding: '12px',
};

export default function ChartVisualization({
  csvData, csvHeaders, csvLoading, csvError,
  chartType, setChartType, xAxisKey, setXAxisKey, yAxisKey, setYAxisKey,
  aiAnswer, aiWarning, resourceTitle,
}: ChartVisualizationProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!chartRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true, backgroundColor: '#ffffff', style: { transform: 'scale(1)' },
      });
      const link = document.createElement('a');
      link.download = 'infographie-datagouv.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  };

  return (
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
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">{aiAnswer}</h3>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Source : {resourceTitle}
            </p>
          </div>
        )}

        {aiWarning && (
          <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm font-medium leading-relaxed">{aiWarning}</div>
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
                <select value={xAxisKey} onChange={(e) => setXAxisKey(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Axe Y</label>
                <select value={yAxisKey} onChange={(e) => setYAxisKey(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="h-[400px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={csvData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={xAxisKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={10} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey={yAxisKey} fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                ) : (
                  <LineChart data={csvData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={xAxisKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={10} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey={yAxisKey} stroke="#4F46E5" strokeWidth={3}
                      dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-8 flex items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-100 pt-6">
              <span className="flex items-center gap-1.5"><Bot className="w-4 h-4" /> Généré par l&apos;IA Data Analyst</span>
              <span>data.gouv.fr</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Aucune donnée disponible pour la visualisation.
          </div>
        )}
      </div>

      {!csvLoading && !csvError && csvData.length > 0 && (
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button onClick={handleDownloadImage}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Partager l&apos;infographie
          </button>
        </div>
      )}
    </div>
  );
}

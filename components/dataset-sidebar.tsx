'use client';

import { Database, FileText, Download } from 'lucide-react';
import { Dataset, Resource } from '@/lib/api';

interface DatasetSidebarProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  selectedResource: Resource | null;
  onSelectDataset: (dataset: Dataset) => void;
  onSelectResource: (resource: Resource) => void;
}

export default function DatasetSidebar({
  datasets, selectedDataset, selectedResource,
  onSelectDataset, onSelectResource,
}: DatasetSidebarProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Résultats ({datasets.length})
          </h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {datasets.map((dataset) => (
            <button
              key={dataset.id}
              onClick={() => onSelectDataset(dataset)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                selectedDataset?.id === dataset.id
                  ? 'bg-blue-50 border-blue-100 border text-blue-900'
                  : 'hover:bg-slate-50 border border-transparent text-slate-700'
              }`}
            >
              <h3 className="font-medium line-clamp-2 text-sm">{dataset.title}</h3>
              {dataset.organization?.name && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{dataset.organization.name}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDataset && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{selectedDataset.title}</h2>
          {selectedDataset.organization?.name && (
            <div className="text-sm font-medium text-blue-600 mb-3">{selectedDataset.organization.name}</div>
          )}
          <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 hover:line-clamp-none transition-all mb-4">
            {selectedDataset.description}
          </p>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            Ressources
          </h3>
          <div className="space-y-2">
            {selectedDataset.resources.map((resource) => (
              <div key={resource.id}
                className={`p-3 rounded-xl border transition-all ${
                  selectedResource?.id === resource.id
                    ? 'border-blue-300 bg-blue-50/30 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                <h4 className="font-medium text-slate-900 text-sm truncate" title={resource.title}>{resource.title}</h4>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wider">
                    {resource.format}
                  </span>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Download className="w-3 h-3" /> Télécharger
                  </a>
                  {resource.format && resource.format.trim().toLowerCase() === 'csv' && (
                    <button onClick={() => onSelectResource(resource)}
                      className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedResource?.id === resource.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}>
                      {selectedResource?.id === resource.id ? 'Actif' : 'Visualiser'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {selectedDataset.resources.length === 0 && (
              <p className="text-sm text-slate-500 italic">Aucune ressource disponible.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

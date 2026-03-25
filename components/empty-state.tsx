'use client';

import { Database, Sparkles, ExternalLink } from 'lucide-react';
import { searchDatasets, Dataset } from '@/lib/api';

interface EmptyStateProps {
  onSearch: (term: string, results: Dataset[]) => void;
  setLoading: (loading: boolean) => void;
}

const SUGGESTED_TERMS = ['Elections', 'Logement', 'Transports', 'Environnement'];

export default function EmptyState({ onSearch, setLoading }: EmptyStateProps) {
  const handleQuickSearch = async (term: string) => {
    setLoading(true);
    try {
      const results = await searchDatasets(term);
      onSearch(term, results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        {SUGGESTED_TERMS.map(term => (
          <button
            key={term}
            onClick={() => handleQuickSearch(term)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}

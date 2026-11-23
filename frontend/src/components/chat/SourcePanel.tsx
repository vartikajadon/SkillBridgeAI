import React, { useEffect, useState } from 'react';
import { SourceCitation, SourcePassageResponse } from '../../types/chat';
import { BookOpen, CheckCircle, FileText, Hash, Info, Loader2, X } from 'lucide-react';

interface SourcePanelProps {
  citation: SourceCitation | null;
  sessionToken: string;
  onClose: () => void;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({
  citation,
  sessionToken,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [passage, setPassage] = useState<SourcePassageResponse | null>(null);

  useEffect(() => {
    if (!citation) {
      setPassage(null);
      setError(null);
      return;
    }

    const fetchPassage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/chat/sources/${citation.chunk_id}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('This source passage is unavailable or belongs to an unpublished document.');
          }
          throw new Error(`Failed to load source passage (${res.status})`);
        }
        const data: SourcePassageResponse = await res.json();
        setPassage(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching passage');
      } finally {
        setLoading(false);
      }
    };

    fetchPassage();
  }, [citation, sessionToken]);

  if (!citation) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Source Passage {citation.citation_id}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Close source inspection panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Meta Bar */}
      <div className="px-5 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center gap-4 text-xs text-indigo-900 dark:text-indigo-300">
        <div className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-medium truncate max-w-[220px]" title={citation.document_title}>
            {citation.document_title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Chunk #{citation.chunk_index + 1}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
          <span>Match: {(citation.similarity_score * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs">Retrieving official text passage...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {passage && !loading && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Grounded in verified official training material.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Retrieved Passage
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {passage.content}
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Passage Token Count:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{passage.token_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Source Document ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[200px]">
                  {passage.document_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chunk ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[200px]">
                  {passage.chunk_id}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

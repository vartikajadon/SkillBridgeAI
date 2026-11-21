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
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">
            Source Passage {citation.citation_id}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          title="Close source inspection panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Meta Bar */}
      <div className="px-5 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-4 text-xs text-blue-900">
        <div className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium truncate max-w-[220px]" title={citation.document_title}>
            {citation.document_title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="w-3.5 h-3.5 text-blue-600" />
          <span>Chunk #{citation.chunk_index + 1}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-200">
          <span>Match: {(citation.similarity_score * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs">Retrieving official text passage...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {passage && !loading && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Grounded in verified official training material.</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Full Retrieved Passage
              </label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {passage.content}
              </div>
            </div>

            <div className="p-3 bg-gray-100 rounded text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Passage Token Count:</span>
                <span className="font-mono text-gray-700">{passage.token_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Source Document ID:</span>
                <span className="font-mono text-gray-700 text-[11px] truncate max-w-[200px]">
                  {passage.document_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chunk ID:</span>
                <span className="font-mono text-gray-700 text-[11px] truncate max-w-[200px]">
                  {passage.chunk_id}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

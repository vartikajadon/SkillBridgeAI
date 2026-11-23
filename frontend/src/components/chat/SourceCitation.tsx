import React from 'react';
import { SourceCitation as SourceCitationType } from '../../types/chat';
import { ExternalLink, FileText } from 'lucide-react';

interface SourceCitationProps {
  citation: SourceCitationType;
  onClick: (citation: SourceCitationType) => void;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, onClick }) => {
  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700 dark:hover:bg-slate-750 transition-colors shadow-sm cursor-pointer mr-1.5 mb-1.5 group"
      title={`Click to inspect passage from ${citation.document_title}`}
    >
      <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-800" />
      <span className="font-bold text-indigo-700 dark:text-indigo-300">{citation.citation_id}</span>
      <span className="max-w-[140px] truncate">{citation.document_title}</span>
      <span className="text-[10px] text-indigo-600 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 px-1 py-0.2 rounded font-mono">
        p.{citation.chunk_index + 1}
      </span>
      <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 ml-0.5" />
    </button>
  );
};

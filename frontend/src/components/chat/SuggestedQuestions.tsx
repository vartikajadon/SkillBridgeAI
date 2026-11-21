import React from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const DEFAULT_QUESTIONS = [
  'What is the direct purchase limit on the GeM portal?',
  'How does L-1 price comparison work on GeM between ₹25,000 and ₹5,00,000?',
  'What are the mandatory requirements for bidding and reverse auctions above ₹5,00,000?',
  'What is the role of GFR Rule 149 in public procurement?',
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>Suggested Training Inquiries</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {DEFAULT_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="flex items-start gap-2 p-2.5 text-left text-xs bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700 hover:text-indigo-900 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [input, setInput] = useState<string>('');

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || trimmed.length < 3) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="relative rounded-lg border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-sm transition-all">
        <textarea
          rows={2}
          value={input}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about government procedures, manuals, or training materials..."
          className="w-full resize-none p-3 pr-24 text-sm text-gray-900 placeholder-gray-400 focus:outline-none rounded-lg disabled:bg-gray-50 disabled:cursor-not-allowed"
          maxLength={1000}
        />

        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
            {input.length}/1000
          </span>
          <button
            type="button"
            disabled={disabled || input.trim().length < 3}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Send query (Enter)"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>Grounded strictly on authorized government materials.</span>
        <span className="hidden sm:inline">Press Enter to submit, Shift+Enter for new line</span>
      </div>
    </div>
  );
};

import React from 'react';
import { ChatMessageItem, SourceCitation as SourceCitationType } from '../../types/chat';
import { SourceCitation } from './SourceCitation';
import { Bot, CheckCircle2, ShieldAlert, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageItem;
  onCitationClick: (citation: SourceCitationType) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCitationClick }) => {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start max-w-[85%] md:max-w-[75%] gap-2.5 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-sm">
              {message.text}
            </div>
            <div className="text-[10px] text-gray-400 text-right mt-1 font-mono">
              {message.timestamp}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant response
  return (
    <div className="flex justify-start mb-5">
      <div className="flex items-start max-w-[90%] md:max-w-[80%] gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>

        <div className="flex-1 space-y-2">
          {/* Grounding Status Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800">SkillBridge Learning Assistant</span>
            {message.loading ? (
              <span className="text-[11px] text-indigo-600 animate-pulse font-medium">
                Searching training library...
              </span>
            ) : message.isGrounded ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Grounded in Official Manuals
              </span>
            ) : message.refusalReason ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Unverified / Insufficient Evidence
              </span>
            ) : null}
          </div>

          {/* Message Body */}
          <div className={`p-4 rounded-2xl rounded-tl-none border text-sm leading-relaxed shadow-sm ${
            message.isGrounded === false && message.refusalReason
              ? 'bg-amber-50/60 border-amber-200 text-gray-800'
              : 'bg-white border-gray-200 text-gray-800'
          }`}>
            {message.loading ? (
              <div className="flex items-center gap-2 py-2 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-.5s]"></span>
                <span className="text-xs text-gray-500 ml-1">Analyzing authorized documents...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-sans">{message.text}</div>
            )}
          </div>

          {/* Citations Footer */}
          {!message.loading && message.citations && message.citations.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Official Sources ({message.citations.length}):
              </div>
              <div className="flex flex-wrap items-center">
                {message.citations.map((c) => (
                  <SourceCitation key={c.chunk_id} citation={c} onClick={onCitationClick} />
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-400 font-mono">
            {message.timestamp}
          </div>
        </div>
      </div>
    </div>
  );
};

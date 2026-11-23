import React, { useEffect, useRef, useState } from 'react';
import {
  ChatAnswerResponse,
  ChatMessageItem,
  ChatQueryRequest,
  SourceCitation as SourceCitationType,
} from '../../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SourcePanel } from './SourcePanel';
import { SuggestedQuestions } from './SuggestedQuestions';
import {
  Bot,
  Info,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface LearningAssistantProps {
  sessionToken: string;
}

export const LearningAssistant: React.FC<LearningAssistantProps> = ({ sessionToken }) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! I am your AI Learning Assistant, grounded strictly in authorized public sector training materials, manuals, and circulars.\n\nAsk any question regarding public procurement (e.g. GeM rules & GFR 149), civil service protocols, or government compliance. All answers include verifiable citations to official training documents.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGrounded: true,
    },
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<SourceCitationType | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (questionText: string) => {
    if (!questionText.trim() || loading) return;

    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessageItem = {
      id: userMsgId,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const pendingMsg: ChatMessageItem = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setLoading(true);

    try {
      const payload: ChatQueryRequest = {
        question: questionText,
      };

      const res = await fetch('/api/v1/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Inquiry failed with status ${res.status}`);
      }

      const data: ChatAnswerResponse = await res.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: data.answer,
                citations: data.citations,
                isGrounded: data.is_grounded,
                refusalReason: data.refusal_reason,
                loading: false,
              }
            : msg
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error processing question';
      setError(errMsg);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: `I encountered an issue communicating with the knowledge base (${errMsg}). Please try again shortly.`,
                isGrounded: false,
                refusalReason: 'error',
                loading: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist with your public sector training today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: true,
      },
    ]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[750px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden relative transition-colors">
      {/* Top Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between border-b border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold leading-none">AI Learning Assistant</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              Semantic retrieval across verified public sector training manuals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1.5"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-rose-950/40 border-b border-red-200 dark:border-rose-800 px-4 py-2.5 text-xs text-red-700 dark:text-rose-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggested Inquiries (Starter) */}
      {messages.length <= 2 && (
        <SuggestedQuestions onSelect={handleSendMessage} disabled={loading} />
      )}

      {/* Scrollable Chat History */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/80 dark:bg-slate-950/50">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            message={m}
            onCitationClick={(cit) => setSelectedCitation(cit)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <ChatInput onSendMessage={handleSendMessage} disabled={loading} />

      {/* Side Slide-Out Source Panel for Citation Inspection */}
      <SourcePanel
        citation={selectedCitation}
        sessionToken={sessionToken}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};

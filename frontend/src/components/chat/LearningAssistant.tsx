import React, { useEffect, useRef, useState } from 'react';
import {
  ChatAnswerResponse,
  ChatCourseItem,
  ChatMessageItem,
  ChatQueryRequest,
  SourceCitation as SourceCitationType,
} from '../../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SourcePanel } from './SourcePanel';
import { SuggestedQuestions } from './SuggestedQuestions';
import {
  BookOpen,
  Bot,
  Info,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface LearningAssistantProps {
  sessionToken: string;
}

export const LearningAssistant: React.FC<LearningAssistantProps> = ({ sessionToken }) => {
  const [courses, setCourses] = useState<ChatCourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! I am your AI Learning Assistant, grounded strictly in authorized public sector training materials, manuals, and circulars.\n\nSelect a course focus above or ask any question regarding official guidelines, civil service protocols, and curriculum topics. All answers include verifiable citations to official training documents.',
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

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/v1/chat/courses', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data: ChatCourseItem[] = await res.json();
        setCourses(data);
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [sessionToken]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const crs = courses.find((c) => c.id === courseId);
    if (crs) {
      setMessages((prev) => [
        ...prev,
        {
          id: `course-switch-${Date.now()}`,
          sender: 'assistant',
          text: `Target Course switched to **${crs.title}** (${crs.code}).\n\nI am now grounded in the curriculum and authorized training documents for this course. Feel free to ask any questions about its topics, competencies, or official procedural guidelines!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isGrounded: true,
        },
      ]);
    }
  };

  const getDynamicQuestions = (): string[] => {
    if (!selectedCourse) {
      return [
        'What is the direct purchase limit on the GeM portal?',
        'How does L-1 price comparison work on GeM between ₹25,000 and ₹5,00,000?',
        'What are the mandatory requirements for bidding and reverse auctions?',
        'What is the role of GFR Rule 149 in public procurement?',
      ];
    }
    const code = selectedCourse.code.toUpperCase();
    if (code.includes('DA01') || code.includes('DATA')) {
      return [
        'What are the MoSPI guidelines for data quality in official statistics?',
        'How does National Indicator Framework (NIF) track development targets?',
        'What validation checks are required before publishing datasets on NDAP?',
        'What is the difference between Mean and Median for skewed income distributions?',
      ];
    }
    if (code.includes('DA02') || code.includes('VIZ')) {
      return [
        'Why are normalized choropleth maps preferred over raw count maps?',
        'What visual charts are best for district KPI monitoring across states?',
        'How should district-level administrative dashboards prevent deceptive scaling?',
        'What are the key technical competencies for Data Analysts under FRAC?',
      ];
    }
    if (code.includes('BA01') || code.includes('GPR')) {
      return [
        'What are the primary principles of Government Process Re-engineering (GPR)?',
        'How does single-window digital verification eliminate bureaucratic delays?',
        'What are the mandatory integration points for citizen service workflows?',
        'How can administrative procedures be audited to remove citizen bottlenecks?',
      ];
    }
    if (code.includes('BA02') || code.includes('DPI')) {
      return [
        'How should Business Analysts specify India Stack integration requirements?',
        'What role does DigiLocker play in digital citizen credential verification?',
        'What governance safeguards are mandatory for citizen welfare workflows?',
        'How should functional requirement specifications (FRS) be structured?',
      ];
    }
    if (code.includes('FA01') || code.includes('PFMS') || code.includes('FINANCE')) {
      return [
        'What is the direct purchase limit under GFR Rule 149 on GeM?',
        'What is the timeline for generating CRAC certificate upon consignment arrival?',
        'What are the penalties if a department delays payments beyond 10 days on GeM?',
        'How does electronic bill processing work within PFMS for ministry expenditures?',
      ];
    }
    return [
      `What are the core topics covered in ${selectedCourse.title}?`,
      `What public sector competencies are taught in ${selectedCourse.code}?`,
      'What are the procedural guidelines outlined in the authorized manual?',
      'How does this course align with Mission Karmayogi public administration standards?',
    ];
  };

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
        course_id: selectedCourseId || undefined,
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
              Semantic retrieval across verified public sector training manuals & curriculum
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

      {/* Course Scope Selector Bar */}
      <div className="bg-slate-100 dark:bg-slate-800/90 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Target Course Focus:
          </span>
          {selectedCourse && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              {selectedCourse.code}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="">-- All Published Public Sector Guidelines --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.code}] {c.title}
              </option>
            ))}
          </select>
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
        <SuggestedQuestions
          onSelect={handleSendMessage}
          disabled={loading}
          questions={getDynamicQuestions()}
        />
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

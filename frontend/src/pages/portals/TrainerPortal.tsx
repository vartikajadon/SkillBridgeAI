import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TrainerQuizDetailResponse } from '../../types/trainer';
import { DocumentUploadView } from '../../components/trainer/DocumentUploadView';
import { QuizGenerationStudio } from '../../components/trainer/QuizGenerationStudio';
import { QuizEditor } from '../../components/trainer/QuizEditor';
import { TrainerQuizList } from '../../components/trainer/TrainerQuizList';
import { TrainerCourseList } from '../../components/trainer/TrainerCourseList';
import {
  BookOpen,
  CheckCircle2,
  FileQuestion,
  LogOut,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';

type TabType = 'upload' | 'generate' | 'approve';

export const TrainerPortal: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Sub-flow state: Selected document for studio and quiz editing
  const [initialDocForStudio, setInitialDocForStudio] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<TrainerQuizDetailResponse | null>(null);
  const [loadingQuizDetail, setLoadingQuizDetail] = useState<boolean>(false);
  const [quizDetailError, setQuizDetailError] = useState<string | null>(null);

  // Approve sub-tab: 'quizzes' or 'courses'
  const [approveSubTab, setApproveSubTab] = useState<'quizzes' | 'courses'>('quizzes');

  const token = session?.access_token || '';

  const handleEditQuiz = async (quizId: string) => {
    if (!token) return;
    setLoadingQuizDetail(true);
    setQuizDetailError(null);
    try {
      const res = await fetch(`/api/v1/trainer/quizzes/${quizId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load quiz details (${res.status})`);
      }
      const data: TrainerQuizDetailResponse = await res.json();
      setEditingQuiz(data);
      setActiveTab('approve');
      setApproveSubTab('quizzes');
    } catch (err: unknown) {
      setQuizDetailError(err instanceof Error ? err.message : 'Could not load quiz details');
    } finally {
      setLoadingQuizDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-slate-900 dark:text-white">SkillBridge AI</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 font-medium">
              Faculty / Trainer Portal
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{user?.full_name}</span>
            </Link>
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs — Exactly Three Screens as Requested */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-2.5">
          {/* SCREEN 1 */}
          <button
            onClick={() => {
              setActiveTab('upload');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'upload'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Learning Modules & Training Material</span>
          </button>

          {/* SCREEN 2 */}
          <button
            onClick={() => {
              setActiveTab('generate');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'generate'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>2. Generate MCQs / Quizzes via AI</span>
          </button>

          {/* SCREEN 3 */}
          <button
            onClick={() => {
              setActiveTab('approve');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${activeTab === 'approve'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Edit & Approve (Feed to Learners)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ================================================================= */}
        {/* SCREEN 1: UPLOAD TRAINING MATERIAL (COURSE)                      */}
        {/* ================================================================= */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-50 via-white to-slate-50 dark:from-cyan-950/70 dark:via-slate-900 dark:to-slate-900 border border-cyan-200 dark:border-cyan-900/60 rounded-2xl p-6 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Upload className="w-4 h-4" />
                  <span>Curriculum Document Ingestion</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Upload Training Material & Official Course Manuals
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                  Upload training documents, syllabus guidelines, and administrative circulars (PDF, TXT, MD).
                  The system chunks and vector-indexes them for AI MCQ synthesis and RAG assistance.
                </p>
              </div>
            </div>

            <DocumentUploadView
              sessionToken={token}
              onSelectForQuizGeneration={(documentId) => {
                setInitialDocForStudio(documentId);
                setActiveTab('generate');
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 2: GENERATE MCQS / QUIZZES VIA AI                          */}
        {/* ================================================================= */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <QuizGenerationStudio
              sessionToken={token}
              initialDocumentId={initialDocForStudio}
              onQuizGenerated={(quiz) => {
                setEditingQuiz(quiz);
                setActiveTab('approve');
                setApproveSubTab('quizzes');
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SCREEN 3: EDIT, APPROVE & FEED TO LEARNERS SECTION                */}
        {/* ================================================================= */}
        {activeTab === 'approve' && (
          <div className="space-y-6">
            {/* Header / Sub-tab switcher */}
            <div className="bg-gradient-to-r from-cyan-50 via-white to-slate-50 dark:from-cyan-950/70 dark:via-slate-900 dark:to-slate-900 border border-cyan-200 dark:border-cyan-900/60 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Send className="w-4 h-4" />
                  <span>Faculty Publishing Console</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Edit, Approve & Feed to Learners Section
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Review and edit AI-synthesized quizzes or iGOT courses, verify answer keys, and approve them to go live in the civil service learner portal.
                </p>
              </div>

              {!editingQuiz && (
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setApproveSubTab('quizzes')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${approveSubTab === 'quizzes'
                      ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>AI Quizzes & Assessments</span>
                  </button>
                  <button
                    onClick={() => setApproveSubTab('courses')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${approveSubTab === 'courses'
                      ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>iGOT Courses Feed (3 Cadres)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editing Quiz Sub-view */}
            {loadingQuizDetail ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
                <p className="text-sm font-medium">Retrieving assessment questions and rubric...</p>
              </div>
            ) : quizDetailError ? (
              <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 space-y-3">
                <p className="font-semibold text-sm">Failed to load quiz details</p>
                <p className="text-xs text-rose-600 dark:text-rose-300">{quizDetailError}</p>
                <button
                  onClick={() => setQuizDetailError(null)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-md text-xs font-medium text-white transition"
                >
                  Back to List
                </button>
              </div>
            ) : editingQuiz ? (
              <QuizEditor
                quiz={editingQuiz}
                sessionToken={token}
                onSaved={(updated) => setEditingQuiz(updated)}
                onPublished={() => {
                  setEditingQuiz(null);
                }}
                onBack={() => setEditingQuiz(null)}
              />
            ) : approveSubTab === 'quizzes' ? (
              <TrainerQuizList
                sessionToken={token}
                onEditQuiz={handleEditQuiz}
                onCreateNew={() => {
                  setInitialDocForStudio(null);
                  setActiveTab('generate');
                }}
              />
            ) : (
              <TrainerCourseList sessionToken={token} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

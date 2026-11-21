import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  TrainerDashboardResponse,
  TrainerQuizDetailResponse,
} from '../../types/trainer';
import { DocumentUploadView } from '../../components/trainer/DocumentUploadView';
import { QuizGenerationStudio } from '../../components/trainer/QuizGenerationStudio';
import { QuizEditor } from '../../components/trainer/QuizEditor';
import { TrainerQuizList } from '../../components/trainer/TrainerQuizList';
import {
  CheckCircle,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Sparkles,
  Upload,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react';

type TabType = 'dashboard' | 'documents' | 'studio' | 'quizzes' | 'submissions';

export const TrainerPortal: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Sub-flow state for document -> quiz generation -> editor
  const [initialDocForStudio, setInitialDocForStudio] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<TrainerQuizDetailResponse | null>(null);
  const [loadingQuizDetail, setLoadingQuizDetail] = useState<boolean>(false);
  const [quizDetailError, setQuizDetailError] = useState<string | null>(null);

  // Trainer Dashboard Metrics State
  const [dashboardData, setDashboardData] = useState<TrainerDashboardResponse | null>(null);
  const [dashLoading, setDashLoading] = useState<boolean>(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const token = session?.access_token || '';

  const fetchDashboard = async () => {
    if (!token) return;
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await fetch('/api/v1/dashboard/trainer', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load faculty dashboard (${res.status})`);
      }
      const data: TrainerDashboardResponse = await res.json();
      setDashboardData(data);
    } catch (err: unknown) {
      setDashError(err instanceof Error ? err.message : 'Error fetching faculty dashboard');
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'submissions') {
      fetchDashboard();
    }
  }, [activeTab, token]);

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
      setActiveTab('quizzes');
    } catch (err: unknown) {
      setQuizDetailError(err instanceof Error ? err.message : 'Could not load quiz details');
    } finally {
      setLoadingQuizDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-white">SkillBridge AI</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
              Faculty / Trainer Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{user?.full_name}</span>
            </Link>
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('documents');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'documents'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Document Ingestion</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('studio');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'studio'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Quiz Studio</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('quizzes');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'quizzes'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>Quizzes & Publishing</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('submissions');
              setEditingQuiz(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'submissions'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Learner Submissions</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB 1: FACULTY DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Faculty Welcome Banner */}
            <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border border-cyan-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4" />
                    <span>Faculty Curriculum & Assessment Console</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
                  <p className="text-xs text-slate-300">
                    Department: {user?.department || 'National Academy'} • Designation:{' '}
                    {user?.designation || 'Curriculum Evaluator'} • Access Tier: Faculty / Trainer
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                  <button
                    onClick={() => {
                      setInitialDocForStudio(null);
                      setActiveTab('studio');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Quiz</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>Manage Quizzes</span>
                  </button>
                </div>
              </div>
            </div>

            {dashLoading ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
                <p className="text-sm font-medium">Aggregating faculty metrics, documents, and attempts...</p>
              </div>
            ) : dashError ? (
              <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 space-y-3">
                <p className="font-semibold text-sm">Failed to load faculty metrics</p>
                <p className="text-xs text-rose-300">{dashError}</p>
                <button
                  onClick={fetchDashboard}
                  className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded-md text-xs font-medium text-white transition"
                >
                  Retry
                </button>
              </div>
            ) : dashboardData ? (
              <>
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Documents Uploaded</span>
                    <div className="text-2xl font-bold text-white">
                      {dashboardData.summary.total_documents_uploaded}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {dashboardData.summary.processed_documents_count} chunked & ready
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] text-cyan-400 block font-medium">Quizzes Authored</span>
                    <div className="text-2xl font-bold text-cyan-400">
                      {dashboardData.summary.total_quizzes_created}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Diagnostic & AI evaluations
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] text-indigo-400 block font-medium">Submissions Received</span>
                    <div className="text-2xl font-bold text-indigo-400">
                      {dashboardData.summary.total_attempts_received}
                    </div>
                    <span className="text-[10px] text-slate-400">Learner assessment attempts</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <span className="text-[11px] text-emerald-400 block font-medium">Average Pass Rate</span>
                    <div className="text-2xl font-bold text-emerald-400">
                      {dashboardData.summary.average_pass_rate.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-slate-400">Benchmark mastery threshold</span>
                  </div>
                </div>

                {/* Authored Quizzes & Recent Attempts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Authored Quizzes Quick Summary */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <FileQuestion className="w-4 h-4 text-cyan-400" />
                        <h2 className="text-sm font-bold text-white">Authored Assessments</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('quizzes')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        View all ({dashboardData.quizzes.length})
                      </button>
                    </div>

                    {dashboardData.quizzes.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-xs text-slate-400 italic">No quizzes created yet.</p>
                        <button
                          onClick={() => {
                            setInitialDocForStudio(null);
                            setActiveTab('studio');
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          Generate your first AI Quiz →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.quizzes.slice(0, 5).map((q) => (
                          <div
                            key={q.id}
                            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-white truncate">{q.title}</h3>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                <span>{q.competency_code || 'General Competency'}</span>
                                <span>•</span>
                                <span>{q.question_count} questions</span>
                                <span>•</span>
                                <span>{q.attempts_count} submissions</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                  q.status === 'published'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : q.status === 'draft'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {q.status}
                              </span>
                              <button
                                onClick={() => handleEditQuiz(q.id)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-medium transition"
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Submissions */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white">Recent Learner Attempts</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('submissions')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        View all ({dashboardData.recent_attempts.length})
                      </button>
                    </div>

                    {dashboardData.recent_attempts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        No submissions received on your assessments yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {dashboardData.recent_attempts.slice(0, 5).map((attempt) => (
                          <div
                            key={attempt.id}
                            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-white block truncate">
                                {attempt.learner_name}
                              </span>
                              <div className="text-[10px] text-slate-400 truncate">
                                <span>{attempt.quiz_title}</span> •{' '}
                                <span>
                                  {attempt.completed_at
                                    ? new Date(attempt.completed_at).toLocaleDateString()
                                    : 'Recent'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 shrink-0">
                              <div className="text-right">
                                <span className="font-bold text-white block">
                                  {attempt.score} pts
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {attempt.percentage.toFixed(0)}%
                                </span>
                              </div>
                              <span
                                className={`p-1 rounded-full border ${
                                  attempt.passed
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}
                                title={attempt.passed ? 'Passed' : 'Failed'}
                              >
                                {attempt.passed ? (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: DOCUMENT UPLOAD & CHUNKING */}
        {activeTab === 'documents' && (
          <DocumentUploadView
            sessionToken={token}
            onSelectForQuizGeneration={(documentId) => {
              setInitialDocForStudio(documentId);
              setActiveTab('studio');
            }}
          />
        )}

        {/* TAB 3: AI QUIZ GENERATION STUDIO */}
        {activeTab === 'studio' && (
          <QuizGenerationStudio
            sessionToken={token}
            initialDocumentId={initialDocForStudio}
            onQuizGenerated={(quiz) => {
              setEditingQuiz(quiz);
              setActiveTab('quizzes');
            }}
          />
        )}

        {/* TAB 4: QUIZ AUTHORING, REVIEW & PUBLISHING */}
        {activeTab === 'quizzes' && (
          <div>
            {loadingQuizDetail ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
                <p className="text-sm font-medium">Retrieving assessment questions and rubric...</p>
              </div>
            ) : quizDetailError ? (
              <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 space-y-3">
                <p className="font-semibold text-sm">Failed to load quiz details</p>
                <p className="text-xs text-rose-300">{quizDetailError}</p>
                <button
                  onClick={() => setQuizDetailError(null)}
                  className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded-md text-xs font-medium text-white transition"
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
                  fetchDashboard();
                }}
                onBack={() => setEditingQuiz(null)}
              />
            ) : (
              <TrainerQuizList
                sessionToken={token}
                onEditQuiz={handleEditQuiz}
                onCreateNew={() => {
                  setInitialDocForStudio(null);
                  setActiveTab('studio');
                }}
              />
            )}
          </div>
        )}

        {/* TAB 5: LEARNER SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Learner Assessment Submissions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submission records and grading outcomes across your authored assessments.
                </p>
              </div>
              <button
                onClick={fetchDashboard}
                disabled={dashLoading}
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                title="Refresh submissions"
              >
                <RefreshCw className={`w-4 h-4 ${dashLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {dashboardData?.recent_attempts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">No submissions received yet</p>
                <p className="text-xs text-slate-500">
                  When civil servant learners complete your published diagnostic quizzes, their evaluation attempts will be recorded here.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Learner</th>
                        <th className="py-3 px-4">Assessment Title</th>
                        <th className="py-3 px-4 text-center">Score</th>
                        <th className="py-3 px-4 text-center">Percentage</th>
                        <th className="py-3 px-4 text-center">Result</th>
                        <th className="py-3 px-4 text-right">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {dashboardData?.recent_attempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{attempt.learner_name}</div>
                            <div className="text-[10px] text-slate-400">{attempt.learner_email}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            {attempt.quiz_title}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-white">
                            {attempt.score} pts
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-200">
                            {attempt.percentage.toFixed(0)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                attempt.passed
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border-rose-800'
                              }`}
                            >
                              {attempt.passed ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Passed</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  <span>Failed</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                            {attempt.completed_at
                              ? new Date(attempt.completed_at).toLocaleString()
                              : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

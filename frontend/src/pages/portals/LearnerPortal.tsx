import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LearnerDashboardResponse } from '../../types/dashboard';
import { AssessmentResultResponse } from '../../types/assessment';
import { AssessmentCatalogue } from '../../components/assessment/AssessmentCatalogue';
import { AssessmentTakingView } from '../../components/assessment/AssessmentTakingView';
import { AssessmentResultView } from '../../components/assessment/AssessmentResultView';
import { AssessmentHistoryTable } from '../../components/assessment/AssessmentHistoryTable';
import { CompetencyGapView } from '../../components/assessment/CompetencyGapView';
import { RecommendationList } from '../../components/recommendations/RecommendationList';
import { LearningPathView } from '../../components/recommendations/LearningPathView';
import { LearningAssistant } from '../../components/chat/LearningAssistant';
import {
  Award,
  BookOpen,
  Bot,
  CheckCircle,
  Compass,
  Download,
  FileQuestion,
  History,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Sparkles,
  Target,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { QuickPortalSwitcher } from '../../components/navigation/QuickPortalSwitcher';

type TabType =
  | 'dashboard'
  | 'learning-assistant'
  | 'recommendations'
  | 'learning-path'
  | 'assessments'
  | 'gap-analysis'
  | 'history';

export const LearnerPortal: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Assessment Sub-Flow State
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AssessmentResultResponse | null>(null);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<LearnerDashboardResponse | null>(null);
  const [dashLoading, setDashLoading] = useState<boolean>(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [downloadingTranscript, setDownloadingTranscript] = useState(false);

  const token = session?.access_token || '';

  const handleDownloadTranscript = async () => {
    if (!token) return;
    try {
      setDownloadingTranscript(true);
      const res = await fetch('/api/v1/reports/learner-transcript?format=pdf', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to download transcript (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SkillBridge_Official_Transcript_${user?.full_name?.replace(/\s+/g, '_') || 'Learner'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download transcript');
    } finally {
      setDownloadingTranscript(false);
    }
  };

  const fetchDashboard = async () => {
    if (!token) return;
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await fetch('/api/v1/dashboard/learner', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load learner dashboard (${res.status})`);
      }
      const data: LearnerDashboardResponse = await res.json();
      setDashboardData(data);
    } catch (err: unknown) {
      setDashError(err instanceof Error ? err.message : 'Error fetching dashboard');
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab, token]);

  const handleStartAssessment = (quizId: string) => {
    setCurrentResult(null);
    setActiveQuizId(quizId);
    setActiveTab('assessments');
  };

  const handleAssessmentSubmitted = (result: AssessmentResultResponse) => {
    setActiveQuizId(null);
    setCurrentResult(result);
  };

  const handleBackToCatalogue = () => {
    setActiveQuizId(null);
    setCurrentResult(null);
  };

  const handleViewGapAnalysis = () => {
    setActiveQuizId(null);
    setCurrentResult(null);
    setActiveTab('gap-analysis');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
      {/* Portal Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-slate-900 dark:text-white">SkillBridge AI</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-medium">
              Civil Service Learner
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <QuickPortalSwitcher />
            <ThemeToggle />
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
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

      {/* Tab Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('learning-assistant');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'learning-assistant'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>AI Assistant (RAG)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('recommendations');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'recommendations'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Recommended Courses</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('learning-path');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'learning-path'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Learning Path</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('assessments');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'assessments'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>Diagnostic Assessments</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('gap-analysis');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'gap-analysis'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Competency Gap Radar</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Attempt History</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* User Welcome Banner */}
            <div className="bg-gradient-to-r from-indigo-50 via-white to-slate-50 dark:from-indigo-950/70 dark:via-slate-900 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>Public Sector Competency Portal</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.full_name}</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Department: {user?.department || 'Unassigned'} • Designation:{' '}
                    {user?.designation || 'Learner'} • Employee ID:{' '}
                    {user?.employee_id || 'N/A'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Recommended Courses</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('learning-path')}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Learning Roadmap</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>Take Assessment</span>
                  </button>
                  <button
                    onClick={handleDownloadTranscript}
                    disabled={downloadingTranscript}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                    title="Download Official PDF Academic Transcript"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingTranscript ? 'animate-bounce' : ''}`} />
                    <span>{downloadingTranscript ? 'Generating PDF...' : 'Official Transcript'}</span>
                  </button>
                </div>
              </div>
            </div>

            {dashLoading ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
                <p className="text-sm font-medium">Aggregating learner progress and competencies...</p>
              </div>
            ) : dashError ? (
              <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 space-y-3">
                <p className="font-semibold text-sm">Failed to load dashboard metrics</p>
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
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Enrolled Courses</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {dashboardData.summary.enrolled_courses_count}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {dashboardData.summary.completed_courses_count} completed •{' '}
                      {dashboardData.summary.average_progress.toFixed(0)}% avg progress
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-medium">Quizzes Completed</span>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {dashboardData.summary.total_quizzes_taken}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Avg Score: {dashboardData.summary.average_quiz_score.toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">Competencies Assessed</span>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboardData.summary.competencies_assessed_count}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Active public sector metrics</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">Average Gap Score</span>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {dashboardData.summary.average_gap_score > 0
                        ? `-${dashboardData.summary.average_gap_score.toFixed(1)}`
                        : '0.0'}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Levels below target</span>
                  </div>
                </div>

                {/* Enrolled Courses & Recent Attempts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Enrolled Courses */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Enrolled Learning Modules</h2>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {dashboardData.enrolled_courses.length} Courses
                      </span>
                    </div>

                    {dashboardData.enrolled_courses.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No active course enrollments.</p>
                        <button
                          onClick={() => setActiveTab('recommendations')}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold"
                        >
                          Explore Recommended Courses →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.enrolled_courses.map((course) => (
                          <div
                            key={course.id}
                            className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{course.title}</h3>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span>{course.provider}</span>
                                  <span>•</span>
                                  <span>{course.duration_hours} hrs</span>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                  course.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                                }`}
                              >
                                {course.status}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all"
                                  style={{ width: `${course.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                                {course.progress_percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Quiz Attempts */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <FileQuestion className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Assessment Attempts</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
                      >
                        View all
                      </button>
                    </div>

                    {dashboardData.recent_quiz_attempts.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
                        No assessments completed yet. Take a diagnostic test to begin.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {dashboardData.recent_quiz_attempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white block">
                                {attempt.quiz_title}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {attempt.completed_at
                                  ? new Date(attempt.completed_at).toLocaleDateString()
                                  : 'Recently completed'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 shrink-0">
                              <div className="text-right">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {attempt.score} pts
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {attempt.percentage.toFixed(0)}%
                                </span>
                              </div>
                              <span
                                className={`p-1 rounded-full border ${
                                  attempt.passed
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                }`}
                                title={attempt.passed ? 'Passed' : 'Not Met'}
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

        {/* TAB 2: RECOMMENDED COURSES */}
        {activeTab === 'recommendations' && (
          <RecommendationList
            sessionToken={token}
            onEnrollmentSuccess={fetchDashboard}
          />
        )}

        {/* TAB 3: LEARNING PATH ROADMAP */}
        {activeTab === 'learning-path' && (
          <LearningPathView
            sessionToken={token}
            onEnrollmentSuccess={fetchDashboard}
          />
        )}

        {/* TAB 4: ASSESSMENTS (CATALOGUE / TEST TAKING / RESULTS) */}
        {activeTab === 'assessments' && (
          <div>
            {currentResult ? (
              <AssessmentResultView
                result={currentResult}
                onViewGapAnalysis={handleViewGapAnalysis}
                onBackToCatalogue={handleBackToCatalogue}
              />
            ) : activeQuizId ? (
              <AssessmentTakingView
                quizId={activeQuizId}
                sessionToken={token}
                onBack={handleBackToCatalogue}
                onSubmitted={handleAssessmentSubmitted}
              />
            ) : (
              <AssessmentCatalogue
                sessionToken={token}
                onSelectAssessment={handleStartAssessment}
              />
            )}
          </div>
        )}

        {/* TAB 5: COMPETENCY GAP RADAR */}
        {activeTab === 'gap-analysis' && (
          <CompetencyGapView
            sessionToken={token}
            onStartAssessment={() => {
              setActiveTab('assessments');
              setActiveQuizId(null);
              setCurrentResult(null);
            }}
          />
        )}

        {/* TAB 6: ATTEMPT HISTORY */}
        {activeTab === 'history' && (
          <AssessmentHistoryTable sessionToken={token} />
        )}

        {/* TAB 7: AI LEARNING ASSISTANT (RAG) */}
        {activeTab === 'learning-assistant' && (
          <div className="space-y-6">
            <LearningAssistant sessionToken={token} />
          </div>
        )}
      </main>
    </div>
  );
};

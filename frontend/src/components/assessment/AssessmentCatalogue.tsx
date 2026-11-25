import React, { useEffect, useState } from 'react';
import { AssessmentCatalogueItem } from '../../types/assessment';
import { Award, BookOpen, CheckCircle, Clock, FileQuestion, HelpCircle, Lock, RefreshCw } from 'lucide-react';

interface Props {
  sessionToken: string;
  onSelectAssessment: (quizId: string) => void;
}

export const AssessmentCatalogue: React.FC<Props> = ({ sessionToken, onSelectAssessment }) => {
  const [assessments, setAssessments] = useState<AssessmentCatalogueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/assessment/catalogue', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load assessments (${res.status})`);
      }
      const data: AssessmentCatalogueItem[] = await res.json();
      setAssessments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [sessionToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-sm">Loading available role assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 space-y-3">
        <p className="font-semibold text-sm">Unable to load assessment catalogue</p>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={fetchCatalogue}
          className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded-md text-xs font-medium text-white transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
        <HelpCircle className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Course Assessments Active</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Assessments and quizzes are available only for courses you are currently pursuing. Enroll in a course from your Learning Path or Course Catalog to unlock its evaluations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Diagnostic Skill Assessments</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a verified competency evaluation for your assigned public-sector job role.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full font-medium w-fit">
          {assessments.length} Available
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assessments.map((quiz) => {
          const hasAttempted = quiz.completed_attempts_count > 0;
          const isLocked = quiz.is_locked || (!quiz.course_completed && (quiz.course_progress_percentage ?? 0) < 100);
          const progressPct = quiz.course_progress_percentage ?? 0;

          return (
            <div
              key={quiz.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm transition ${
                isLocked
                  ? 'border-slate-200 dark:border-slate-800 opacity-95'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {quiz.course_title && (
                      <span className="inline-block text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded mb-1">
                        Pursuing Course: {quiz.course_code ? `${quiz.course_code} - ` : ''}{quiz.course_title}
                      </span>
                    )}
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{quiz.title}</span>
                      {isLocked && <Lock className="w-4 h-4 text-amber-500 inline shrink-0" />}
                    </h3>
                  </div>
                  {hasAttempted && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border flex items-center space-x-1 shrink-0 ${
                        quiz.last_attempt_passed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>
                        {quiz.last_attempt_passed ? 'Passed' : 'Needs Retake'} (
                        {quiz.last_attempt_percentage?.toFixed(0)}%)
                      </span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-xs text-slate-700 dark:text-slate-300 border-y border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center space-x-1.5">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{quiz.question_count} Questions</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{quiz.duration_minutes} Mins</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Pass: {quiz.passing_marks}/{quiz.total_marks}</span>
                  </div>
                </div>

                {quiz.competencies_evaluated.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Competencies Evaluated:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {quiz.competencies_evaluated.map((code) => (
                        <span
                          key={code}
                          className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 font-mono"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Course Completion Requirement Banner */}
                {isLocked && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center space-x-2">
                        <span>Locked Evaluation</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-mono font-bold">
                          Course Progress: {progressPct}% / 100%
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300">
                        {quiz.lock_reason || 'Complete all modules of this course to 100% to unlock and attempt this diagnostic assessment.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isLocked
                    ? `Locked (${progressPct}% completed)`
                    : hasAttempted
                    ? `${quiz.completed_attempts_count} previous attempt(s)`
                    : 'Not yet attempted'}
                </span>
                <button
                  disabled={isLocked}
                  onClick={() => !isLocked && onSelectAssessment(quiz.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5 ${
                    isLocked
                      ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                  }`}
                  title={isLocked ? 'Complete course 100% to unlock this quiz' : undefined}
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>Locked (Complete Course 100%)</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{hasAttempted ? 'Retake Assessment' : 'Start Assessment'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

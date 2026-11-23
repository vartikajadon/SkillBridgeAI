import React, { useEffect, useState } from 'react';
import {
  EnrollmentCreateResponse,
  LearningPathResponse,
} from '../../types/recommendation';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Compass,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  onEnrollmentSuccess?: () => void;
}

export const LearningPathView: React.FC<Props> = ({
  sessionToken,
  onEnrollmentSuccess,
}) => {
  const [data, setData] = useState<LearningPathResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLearningPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/recommendations/learning-path', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load learning path (${res.status})`);
      }
      const json: LearningPathResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching learning path');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPath();
  }, [sessionToken]);

  const handleEnroll = async (courseId: string) => {
    setEnrollingCourseId(courseId);
    setNotification(null);
    try {
      const res = await fetch(`/api/v1/recommendations/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Enrollment failed (${res.status})`);
      }

      const resData: EnrollmentCreateResponse = await res.json();

      // Update local learning path steps immediately
      setData((prev) => {
        if (!prev) return prev;
        const updatedSteps = prev.steps.map((step) => {
          if (step.course_id === courseId) {
            return {
              ...step,
              is_enrolled: true,
              enrollment_status: 'enrolled',
              progress_percentage: 0,
            };
          }
          return step;
        });
        return { ...prev, steps: updatedSteps };
      });

      setNotification({
        type: 'success',
        message: resData.message || 'Successfully enrolled in course step!',
      });

      if (onEnrollmentSuccess) {
        onEnrollmentSuccess();
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Enrollment failed',
      });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Synthesizing pedagogical learning path roadmap...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-200 space-y-4 max-w-xl mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <h3 className="text-base font-bold">Failed to Load Learning Path</h3>
        <p className="text-xs text-rose-300">{error || 'Unknown error occurred'}</p>
        <button
          onClick={fetchLearningPath}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.steps.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <Compass className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-semibold text-slate-200">No Learning Path Generated</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All competency benchmarks for your role are currently met, or no prioritized courses remain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Roadmap Header */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Sequenced Learning Roadmap</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {data.job_role_title || 'Public Sector'} Career Progression Path
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Sequenced from foundational skill-building (Level 2) to advanced policy leadership (Levels 4–5),
              prioritizing statutory mandatory milestones before desirable electives.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Curated Steps</span>
              <div className="text-xl font-black text-white">{data.total_steps} Modules</div>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-400 block font-medium">Est. Commitment</span>
              <div className="text-xl font-black text-indigo-400">{data.total_estimated_hours} Hours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sequenced Roadmap Timeline */}
      <div className="relative border-l-2 border-indigo-200 dark:border-indigo-950 ml-4 sm:ml-6 space-y-8 pb-4">
        {data.steps.map((step) => {
          const isHigh = step.priority === 'High';

          return (
            <div key={step.step_number} className="relative pl-6 sm:pl-8">
              {/* Timeline Step Circle Node */}
              <div
                className={`absolute -left-[17px] top-1.5 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition ${
                  step.is_enrolled
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-4 ring-slate-50 dark:ring-slate-950'
                    : 'bg-indigo-100 dark:bg-indigo-950 border-indigo-500 text-indigo-800 dark:text-indigo-200 ring-4 ring-slate-50 dark:ring-slate-950'
                }`}
              >
                {step.step_number}
              </div>

              {/* Step Card Content */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Step {step.step_number} • {step.code}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                        Delivers Level {step.target_level_achieved}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{step.title}</h3>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center space-x-1 ${
                        isHigh
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{step.priority} Priority</span>
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {step.relevance_score.toFixed(0)} pts
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300 py-2 border-y border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="truncate">{step.provider}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{step.duration_hours} Training Hours</span>
                  </div>
                  <div className="flex items-center space-x-1.5 col-span-2 sm:col-span-1">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{step.competencies_addressed.join(', ')}</span>
                  </div>
                </div>

                {/* Plain-Language Reason */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pedagogical Role</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {step.reason}
                  </p>
                </div>

                {/* Footer / Enroll action */}
                <div className="flex items-center justify-between pt-2">
                  {step.is_enrolled ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-semibold flex items-center space-x-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>
                        {step.enrollment_status === 'in_progress'
                          ? `In Progress (${step.progress_percentage || 0}%)`
                          : 'Enrolled in Roadmap'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ready to add to your active learning plan
                    </span>
                  )}

                  {!step.is_enrolled ? (
                    <button
                      onClick={() => handleEnroll(step.course_id)}
                      disabled={enrollingCourseId === step.course_id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-1.5"
                    >
                      {enrollingCourseId === step.course_id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enrolling...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Enroll in Step {step.step_number}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-xl text-xs font-medium cursor-default"
                    >
                      Step Active
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

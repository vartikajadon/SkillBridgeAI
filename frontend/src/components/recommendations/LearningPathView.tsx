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
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Video,
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
        message: resData.message || 'Successfully enrolled in course!',
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
        <p className="text-sm font-medium">Loading learning path...</p>
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
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <Compass className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">No Learning Path Generated</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          All competency benchmarks for your role are currently met, or no prioritized courses remain.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Learning Path</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.job_role_title ? `${data.job_role_title} Course Path` : 'Course Learning Path'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Complete each course in your pathway to build your competencies step-by-step.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Courses</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{data.total_steps} Courses</div>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Duration</span>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{data.total_estimated_hours} Hours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
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

      {/* Simple Course Path List */}
      <div className="space-y-6">
        {data.steps.map((course, index) => {
          const stepPct = course.progress_percentage || (course.is_enrolled ? (course.enrollment_status === 'completed' ? 100 : 30) : 0);
          const modules = course.modules || [];

          return (
            <div
              key={course.course_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow transition space-y-5"
            >
              {/* Course Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Course {index + 1}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {course.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      Level {course.target_level_achieved}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {course.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{course.provider}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{course.duration_hours} Hours</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{course.competencies_addressed.join(', ')}</span>
                    </span>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center space-x-3 shrink-0">
                  {course.is_enrolled ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {stepPct >= 100
                          ? 'Completed'
                          : `Enrolled (${stepPct}%)`}
                      </span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.course_id)}
                      disabled={enrollingCourseId === course.course_id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-1.5"
                    >
                      {enrollingCourseId === course.course_id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enrolling...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Enroll Course</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Course Progress Bar */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Course Progress</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {stepPct}% Complete
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stepPct >= 100
                        ? 'bg-emerald-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.max(stepPct > 0 ? 3 : 0, stepPct)}%` }}
                  />
                </div>
              </div>

              {/* Modules in this Course */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <Video className="w-4 h-4 text-indigo-500" />
                    <span>Modules in this Course ({modules.length})</span>
                  </div>
                </div>

                {modules.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {modules.map((mod) => (
                      <div
                        key={mod.id || mod.module_number}
                        className="p-3.5 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition"
                      >
                        <div className="flex items-start sm:items-center space-x-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            {mod.module_number}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {mod.title}
                            </span>
                            {mod.description && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {mod.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 pl-9 sm:pl-0 text-slate-500 dark:text-slate-400 text-[11px]">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{mod.duration_minutes} mins</span>
                          </span>
                          {mod.content && (
                            <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400">
                              <FileText className="w-3 h-3" />
                              <span>Learning Material</span>
                            </span>
                          )}
                          {mod.is_completed ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    Module details loading or unavailable.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

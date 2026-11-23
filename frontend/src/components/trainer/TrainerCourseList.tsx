import React, { useEffect, useState } from 'react';
import { TrainerCourseItem } from '../../types/trainer';
import {
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';

interface Props {
  sessionToken: string;
}

export const TrainerCourseList: React.FC<Props> = ({ sessionToken }) => {
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/trainer/courses', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load courses (${res.status})`);
      }
      const data: TrainerCourseItem[] = await res.json();
      setCourses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [sessionToken]);

  const handlePublishCourse = async (courseId: string, title: string) => {
    setActionLoadingId(courseId);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/trainer/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to approve course');
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: 'published' } : c))
      );
      setSuccessMsg(`Course '${title}' is approved and now actively feeding the civil service learner catalogue!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error publishing course');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnpublishCourse = async (courseId: string) => {
    setActionLoadingId(courseId);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/trainer/courses/${courseId}/unpublish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to unpublish course');
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: 'draft' } : c))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error changing course status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (roleFilter === 'all') return true;
    return c.target_role === roleFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>iGOT Curriculum & Course Feed Manager</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review flagship iGOT Karmayogi courses across Data Analyst, Business Analyst, and Finance Assistant. Approve and feed them to civil service learners.
          </p>
        </div>

        <button
          onClick={fetchCourses}
          disabled={loading}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition self-start sm:self-auto shadow-sm"
          title="Refresh Course Catalogue"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Role Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-medium mr-1">Filter by Cadre:</span>
        {[
          { key: 'all', label: 'All Cadres' },
          { key: 'Data Analyst', label: 'Data Analyst' },
          { key: 'Business Analyst', label: 'Business Analyst' },
          { key: 'Finance Assistant', label: 'Finance Assistant' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              roleFilter === f.key
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
          <p className="text-xs font-medium">Loading iGOT courses...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 space-y-3">
          <p className="text-xs font-semibold">{error}</p>
          <button
            onClick={fetchCourses}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 text-xs">
          No courses matching the selected cadre.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-cyan-500/40 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {c.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      {c.target_role || 'General Civil Service'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{c.duration_hours} hrs</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{c.provider}</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {c.description?.split('\n')[0] || c.description}
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                      c.status === 'published'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {c.status === 'published' ? '✓ Feeding Learners' : 'Draft (Pending)'}
                  </span>

                  {c.status === 'published' ? (
                    <button
                      onClick={() => handleUnpublishCourse(c.id)}
                      disabled={actionLoadingId === c.id}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      Move to Draft
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublishCourse(c.id, c.title)}
                      disabled={actionLoadingId === c.id}
                      className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Approve & Feed</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Competency Badges */}
              {c.competencies && c.competencies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium">Mapped Competencies:</span>
                  {c.competencies.map((comp) => (
                    <span
                      key={comp}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {comp}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-400 ml-auto flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{c.enrollments_count} active enrollments</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

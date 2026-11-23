import React, { useEffect, useState } from 'react';
import {
  CourseRecommendationsResponse,
  EnrollmentCreateResponse,
} from '../../types/recommendation';
import { RecommendationCard } from './RecommendationCard';
import { RecommendationExplanation } from './RecommendationExplanation';
import {
  AlertTriangle,
  BookOpen,
  HelpCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  onEnrollmentSuccess?: () => void;
}

export const RecommendationList: React.FC<Props> = ({
  sessionToken,
  onEnrollmentSuccess,
}) => {
  const [data, setData] = useState<CourseRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [filter, setFilter] = useState<'all' | 'high' | 'unenrolled' | 'enrolled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // In-flight enrollment tracking
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/recommendations/', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load recommendations (${res.status})`);
      }
      const json: CourseRecommendationsResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
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
        throw new Error(errorData?.detail || `Enrollment failed with status ${res.status}`);
      }

      const resData: EnrollmentCreateResponse = await res.json();

      // Update local state immediately
      setData((prev) => {
        if (!prev) return prev;
        const updatedRecs = prev.recommendations.map((rec) => {
          if (rec.course_id === courseId) {
            return {
              ...rec,
              is_enrolled: true,
              enrollment_status: 'enrolled',
              progress_percentage: 0,
            };
          }
          return rec;
        });
        return { ...prev, recommendations: updatedRecs };
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
        <p className="text-sm font-medium">Computing personalized course recommendations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-200 space-y-4 max-w-xl mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <h3 className="text-base font-bold">Failed to Load Recommendations</h3>
        <p className="text-xs text-rose-300">{error || 'Unknown error occurred'}</p>
        <button
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filter recommendations
  const filteredRecs = data.recommendations.filter((rec) => {
    // Priority / Enrollment filter
    if (filter === 'high' && rec.priority !== 'High') return false;
    if (filter === 'unenrolled' && rec.is_enrolled) return false;
    if (filter === 'enrolled' && !rec.is_enrolled) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rec.title.toLowerCase().includes(q);
      const matchCode = rec.code.toLowerCase().includes(q);
      const matchComp = rec.competencies_addressed.some(
        (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchCode && !matchComp) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Personalized Curriculum AI</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Recommended Courses: {data.job_role_title || 'Public Sector Career'}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {data.summary_reason}
            </p>
          </div>

          <button
            onClick={() => setShowExplanation(true)}
            className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Ranking Formula</span>
          </button>
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

      {/* Controls: Search & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by course title, code, or competency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            All ({data.recommendations.length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'high'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setFilter('unenrolled')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'unenrolled'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            Available to Enroll
          </button>
          <button
            onClick={() => setFilter('enrolled')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'enrolled'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            Enrolled
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredRecs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Matching Courses Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'Try modifying your search keywords or resetting filters.'
              : 'All role requirements are currently satisfied or no courses match the filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecs.map((rec) => (
            <RecommendationCard
              key={rec.course_id}
              recommendation={rec}
              onEnroll={handleEnroll}
              isEnrolling={enrollingCourseId === rec.course_id}
            />
          ))}
        </div>
      )}

      {/* Explanation Modal */}
      <RecommendationExplanation
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  );
};

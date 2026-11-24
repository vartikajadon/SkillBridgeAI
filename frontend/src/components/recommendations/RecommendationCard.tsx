import React from 'react';
import { CourseRecommendationItem } from '../../types/recommendation';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Layers,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

interface Props {
  recommendation: CourseRecommendationItem;
  onEnroll: (courseId: string) => Promise<void>;
  onViewDetails?: (recommendation: CourseRecommendationItem) => void;
  isEnrolling: boolean;
}

export const RecommendationCard: React.FC<Props> = ({
  recommendation,
  onEnroll,
  onViewDetails,
  isEnrolling,
}) => {
  const isHigh = recommendation.priority === 'High';
  const isMedium = recommendation.priority === 'Medium';

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md transition relative overflow-hidden ${
        isHigh
          ? 'border-indigo-300 dark:border-indigo-900/80 hover:border-indigo-500 dark:hover:border-indigo-700'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="space-y-4">
        {/* Header row: Title & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {recommendation.code}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {recommendation.title}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center space-x-1 ${
                isHigh
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : isMedium
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{recommendation.priority} Priority</span>
            </span>

            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {recommendation.relevance_score.toFixed(0)} pts
            </span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300 py-2 border-y border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate">{recommendation.provider}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{recommendation.duration_hours} Training Hours</span>
          </div>
          <div className="flex items-center space-x-1.5 col-span-2 sm:col-span-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{recommendation.modules?.length || 5} Video Modules</span>
          </div>
        </div>

        {/* Competencies Addressed Chips */}
        {recommendation.competencies_addressed.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Target Competencies Bridged
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recommendation.competencies_addressed.map((comp) => (
                <div
                  key={comp.competency_id}
                  className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center space-x-1.5"
                >
                  <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{comp.code}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    (Gap: -{comp.gap_score})
                  </span>
                  <span className="text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 font-mono">
                    Delivers L{comp.target_level_achieved}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plain-Language Explanation */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-1 text-xs">
          <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommendation Rationale</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            {recommendation.reason}
          </p>
        </div>
      </div>

      {/* Footer / Enrollment Action */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center space-x-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(recommendation)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-300/80 dark:border-slate-700"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>View Details</span>
            </button>
          )}

          {recommendation.is_enrolled ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                {recommendation.enrollment_status === 'in_progress'
                  ? `In Progress (${recommendation.progress_percentage || 0}%)`
                  : 'Enrolled'}
              </span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Available to enroll</span>
          )}
        </div>

        {!recommendation.is_enrolled ? (
          <button
            onClick={() => onEnroll(recommendation.course_id)}
            disabled={isEnrolling}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0"
          >
            {isEnrolling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enrolling...</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>Enroll in Course</span>
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="px-3.5 py-1.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-xl text-xs font-medium cursor-default shrink-0"
          >
            Active on Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

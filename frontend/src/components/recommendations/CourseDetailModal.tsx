import React, { useState } from 'react';
import {
  CourseRecommendationItem,
  CourseVideoModuleItem,
  ModuleCompleteResponse,
} from '../../types/recommendation';
import {
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  Layers,
  Loader2,
  Play,
  Sparkles,
  Trophy,
  Video,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  course: CourseRecommendationItem | null;
  onClose: () => void;
  onEnroll: (courseId: string) => Promise<void>;
  isEnrolling: boolean;
  sessionToken?: string;
  onModuleCompleted?: (courseId: string, updatedProgress: number, updatedStatus: string, updatedModules: CourseVideoModuleItem[]) => void;
}

export const CourseDetailModal: React.FC<Props> = ({
  course,
  onClose,
  onEnroll,
  isEnrolling,
  sessionToken,
  onModuleCompleted,
}) => {
  const [activeModule, setActiveModule] = useState<CourseVideoModuleItem | null>(null);
  const [moduleViewMode, setModuleViewMode] = useState<'video' | 'material'>('material');
  const [copied, setCopied] = useState<boolean>(false);
  const [completingModuleId, setCompletingModuleId] = useState<string | null>(null);
  const [localCourse, setLocalCourse] = useState<CourseRecommendationItem | null>(course);
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalCourse(course);
  }, [course]);

  if (!localCourse) return null;

  const currentCourse = localCourse;
  const modules = currentCourse.modules && currentCourse.modules.length > 0 ? currentCourse.modules : [];
  const isHigh = currentCourse.priority === 'High';
  const isMedium = currentCourse.priority === 'Medium';
  const progressPct = currentCourse.progress_percentage || 0;
  const isCourse100 = progressPct >= 100 || currentCourse.enrollment_status === 'completed';

  const handleCopyMaterial = () => {
    if (!activeModule?.content) return;
    navigator.clipboard.writeText(activeModule.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkModuleComplete = async (mod: CourseVideoModuleItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletingModuleId(mod.id);
    setActionNotification(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`/api/v1/recommendations/${currentCourse.course_id}/modules/${mod.module_number}/complete`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Failed to mark module complete (${res.status})`);
      }

      const resData: ModuleCompleteResponse = await res.json();

      // Update modules completion status locally
      const updatedModules = modules.map((m) => {
        if (m.module_number <= resData.completed_modules_count) {
          return { ...m, is_completed: true };
        }
        return m;
      });

      const updatedCourse: CourseRecommendationItem = {
        ...currentCourse,
        is_enrolled: true,
        enrollment_status: resData.course_status,
        progress_percentage: resData.progress_percentage,
        modules: updatedModules,
      };

      setLocalCourse(updatedCourse);
      if (activeModule && activeModule.module_number <= resData.completed_modules_count) {
        setActiveModule({ ...activeModule, is_completed: true });
      }

      setActionNotification(resData.message);

      if (onModuleCompleted) {
        onModuleCompleted(
          currentCourse.course_id,
          resData.progress_percentage,
          resData.course_status,
          updatedModules
        );
      }
    } catch (err: unknown) {
      setActionNotification(err instanceof Error ? err.message : 'Error updating module progress');
    } finally {
      setCompletingModuleId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                {currentCourse.code}
              </span>
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
                <span>{currentCourse.priority} Priority</span>
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {currentCourse.relevance_score.toFixed(0)} Relevance pts
              </span>
              {isCourse100 ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 flex items-center space-x-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span>100% Course Completed</span>
                </span>
              ) : progressPct > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                  Progress: {progressPct}%
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {currentCourse.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Notification banner */}
          {actionNotification && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{actionNotification}</span>
              </span>
              <button
                onClick={() => setActionNotification(null)}
                className="text-xs underline hover:opacity-80 ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Course Progress Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-indigo-500" />
                <span>Course Completion Progress</span>
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {progressPct}% Completed {isCourse100 && '(Certified 100%)'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCourse100
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.max(progressPct > 0 ? 3 : 0, progressPct)}%` }}
              />
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Accredited Provider</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{currentCourse.provider}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Training Duration</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentCourse.duration_hours} Hours</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
              <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Learning Structure</span>
                <span className="font-bold text-slate-900 dark:text-white">{modules.length} Full Modules</span>
              </div>
            </div>
          </div>

          {/* Active Module Study & Video Lecture Workspace */}
          {activeModule && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-5 space-y-4 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wide">
                      Module {activeModule.module_number} of {modules.length}
                    </span>
                    {activeModule.is_completed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeModule.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Mark Module Complete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleMarkModuleComplete(activeModule, e)}
                    disabled={completingModuleId === activeModule.id || activeModule.is_completed}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 ${
                      activeModule.is_completed
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {completingModuleId === activeModule.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : activeModule.is_completed ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Module Completed</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Module as Complete</span>
                      </>
                    )}
                  </button>

                  {/* Material vs Video Toggle */}
                  <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setModuleViewMode('material')}
                      className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                        moduleViewMode === 'material'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Study Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModuleViewMode('video')}
                      className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
                        moduleViewMode === 'video'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Lecture</span>
                    </button>
                  </div>
                </div>
              </div>

              {moduleViewMode === 'material' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Curated Public Administration Reference Notes</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMaterial}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition flex items-center space-x-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Notes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-72 overflow-y-auto text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-sans whitespace-pre-line space-y-2">
                    {activeModule.content || activeModule.description}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 aspect-video shadow-inner flex items-center justify-center">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover rounded-2xl"
                      poster=""
                      src={activeModule.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Module List & Completion Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Course Modules & Learning Material ({modules.length} Sections)</span>
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Mark each module complete to reach 100% course certification
              </span>
            </div>

            <div className="space-y-2.5">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod);
                    setModuleViewMode('material');
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    activeModule?.id === mod.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {mod.module_number}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {mod.title}
                        </h5>
                        {mod.is_completed ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Completed</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {/* Mark as Complete Button per module */}
                    <button
                      type="button"
                      onClick={(e) => handleMarkModuleComplete(mod, e)}
                      disabled={completingModuleId === mod.id || mod.is_completed}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                        mod.is_completed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      }`}
                    >
                      {completingModuleId === mod.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : mod.is_completed ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Mark as Complete</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{mod.duration_minutes}m</span>
                      </span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModule(mod);
                          setModuleViewMode('material');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Study Content
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation Rationale */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-xs">
            <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Recommendation Logic</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              {currentCourse.reason}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>

          {!currentCourse.is_enrolled ? (
            <button
              onClick={() => onEnroll(currentCourse.course_id)}
              disabled={isEnrolling}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-1.5"
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
            <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                {isCourse100
                  ? 'Course 100% Completed'
                  : `In Progress (${progressPct}%)`}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

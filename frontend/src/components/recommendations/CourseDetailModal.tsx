import React, { useState } from 'react';
import {
  CourseRecommendationItem,
  CourseVideoModuleItem,
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
  Target,
  Video,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  course: CourseRecommendationItem | null;
  onClose: () => void;
  onEnroll: (courseId: string) => Promise<void>;
  isEnrolling: boolean;
}

export const CourseDetailModal: React.FC<Props> = ({
  course,
  onClose,
  onEnroll,
  isEnrolling,
}) => {
  const [activeModule, setActiveModule] = useState<CourseVideoModuleItem | null>(null);
  const [moduleViewMode, setModuleViewMode] = useState<'video' | 'material'>('material');
  const [copied, setCopied] = useState<boolean>(false);

  if (!course) return null;

  const modules = course.modules && course.modules.length > 0 ? course.modules : [];
  const isHigh = course.priority === 'High';
  const isMedium = course.priority === 'Medium';

  const handleCopyMaterial = () => {
    if (!activeModule?.content) return;
    navigator.clipboard.writeText(activeModule.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                {course.code}
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
                <span>{course.priority} Priority</span>
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {course.relevance_score.toFixed(0)} Relevance pts
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {course.title}
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
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Accredited Provider</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.provider}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Training</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.duration_hours} Hours</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Curriculum Format</span>
                <span className="font-semibold text-slate-900 dark:text-white">{modules.length} Modules & Learning Material</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Course Syllabus & Overview
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 whitespace-pre-line">
                {course.description}
              </p>
            </div>
          )}

          {/* Competencies Bridged */}
          {course.competencies_addressed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Competencies Bridged (FRAC Framework)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {course.competencies_addressed.map((comp) => (
                  <div
                    key={comp.competency_id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{comp.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{comp.code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold block">
                        Delivers L{comp.target_level_achieved}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Gap: -{comp.gap_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Module Interactive Viewer (Video or Learning Material Content) */}
          {activeModule && (
            <div className="p-5 bg-slate-950 border-2 border-indigo-500/40 rounded-3xl text-white space-y-4 shadow-xl">
              {/* Header with Switcher Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                    Module {activeModule.module_number} Study Portal
                  </span>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{activeModule.title}</span>
                  </h4>
                </div>

                {/* View Mode Toggle: Video vs Learning Material */}
                <div className="flex items-center space-x-2">
                  <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setModuleViewMode('material')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        moduleViewMode === 'material'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Learning Material</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModuleViewMode('video')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                        moduleViewMode === 'video'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Lecture Video ({activeModule.duration_minutes}m)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveModule(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Close module view"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* VIEW 1: LEARNING MATERIAL / STUDY CONTENT */}
              {moduleViewMode === 'material' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Official Learning Material & Syllabus Guide</span>
                    </span>
                    <button
                      onClick={handleCopyMaterial}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-[11px] font-medium flex items-center space-x-1 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Notes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-slate-200 leading-relaxed max-h-[380px] overflow-y-auto space-y-3 font-sans selection:bg-indigo-500 selection:text-white">
                    {activeModule.content ? (
                      <div className="whitespace-pre-line space-y-2">
                        {activeModule.content}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-white">{activeModule.description}</p>
                        <p className="text-slate-400">
                          This module provides comprehensive operational instruction, regulatory statutory guidelines,
                          and case-study problem solving for public sector civil servants.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: LECTURE VIDEO */}
              {moduleViewMode === 'video' && (
                <div className="space-y-3">
                  <div className="aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="relative z-10 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center mx-auto shadow-lg ring-4 ring-indigo-400/20">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                      <h5 className="text-sm font-bold text-white max-w-md">{activeModule.title}</h5>
                      <span className="text-xs text-slate-300 block">
                        {activeModule.duration_minutes} Minutes • Official iGOT Karmayogi Training Lecture
                      </span>
                    </div>

                    {/* Progress bar simulation */}
                    <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center space-x-3 text-[10px] text-slate-300">
                      <span>0:00</span>
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-indigo-500 rounded-full" />
                      </div>
                      <span>{activeModule.duration_minutes}:00</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="font-semibold text-white block mb-1">Lecture Key Points:</span>
                    {activeModule.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5 Video Modules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Course Modules & Learning Material ({modules.length} Detailed Sections)</span>
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any module to read study material or watch lecture
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
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {mod.module_number}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {mod.title}
                        </h5>
                        {mod.is_completed && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold flex items-center space-x-1">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>{mod.duration_minutes} mins</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModule(mod);
                          setModuleViewMode('material');
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Study Content</span>
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModule(mod);
                          setModuleViewMode('video');
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Video</span>
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
              {course.reason}
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

          {!course.is_enrolled ? (
            <button
              onClick={() => onEnroll(course.course_id)}
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
                {course.enrollment_status === 'in_progress'
                  ? `In Progress (${course.progress_percentage || 0}%)`
                  : 'Already Enrolled'}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  TrainerCompetencyItem,
  TrainerCourseItem,
  TrainerCourseModuleItem,
  TrainerDocumentItem,
} from '../../types/trainer';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  FileUp,
  Film,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  onSelectForQuizGeneration?: (documentId: string) => void;
}

export const DocumentUploadView: React.FC<Props> = ({
  sessionToken,
  onSelectForQuizGeneration,
}) => {
  // Global & Data state
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [competencies, setCompetencies] = useState<TrainerCompetencyItem[]>([]);
  const [documents, setDocuments] = useState<TrainerDocumentItem[]>([]);
  const [courseModules, setCourseModules] = useState<TrainerCourseModuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingModules, setLoadingModules] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State: Course selection first
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [moduleDescription, setModuleDescription] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(20);

  // Multi-skill selection state
  const [selectedSkillCodes, setSelectedSkillCodes] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState<string>('');

  // Files & Media State
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Fetch initial courses, competencies, and documents
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, compsRes, docsRes] = await Promise.all([
        fetch('/api/v1/trainer/courses', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
        fetch('/api/v1/trainer/competencies', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
        fetch('/api/v1/trainer/documents', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
      ]);

      if (coursesRes.ok) {
        const cData: TrainerCourseItem[] = await coursesRes.json();
        // Show only active, available official iGOT curriculum courses (omit obsolete unlinked courses)
        const activeCourses = cData.filter(
          (c) =>
            c.code.startsWith('CRS-IGOT-') ||
            (c.status === 'published' &&
              !c.code.startsWith('CRS-STAT-') &&
              !c.code.startsWith('CRS-SQL-') &&
              !c.code.startsWith('CRS-VIZ-') &&
              !c.code.startsWith('CRS-SRV-') &&
              !c.code.startsWith('CRS-ETH-') &&
              !c.code.startsWith('CRS-POL-') &&
              !c.code.startsWith('CRS-AI-'))
        );
        setCourses(activeCourses);
        if (activeCourses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(activeCourses[0].id);
        }
      }

      if (compsRes.ok) {
        const compData: TrainerCompetencyItem[] = await compsRes.json();
        setCompetencies(compData);
      }

      if (docsRes.ok) {
        const dData: TrainerDocumentItem[] = await docsRes.json();
        setDocuments(dData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching trainer data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch modules for the currently selected course
  const fetchModulesForCourse = async (courseId: string) => {
    if (!courseId) return;
    setLoadingModules(true);
    try {
      const res = await fetch(`/api/v1/trainer/courses/${courseId}/modules`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data: TrainerCourseModuleItem[] = await res.json();
        setCourseModules(data);
      } else {
        setCourseModules([]);
      }
    } catch {
      setCourseModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [sessionToken]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchModulesForCourse(selectedCourseId);
    }
  }, [selectedCourseId, sessionToken]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Multi-skill toggle
  const toggleSkillSelection = (code: string) => {
    setSelectedSkillCodes((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError(
          `Document file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum upload limit (10 MB). Please choose a smaller document.`
        );
        e.target.value = '';
        setSelectedDocFile(null);
        return;
      }
      setSelectedDocFile(file);
      if (!moduleTitle) {
        setModuleTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      setSubmitError(null);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 4.2 * 1024 * 1024) {
        setSubmitError(
          `Video file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds serverless payload limit (4.2 MB). Please provide a direct Video URL or choose a smaller sample clip.`
        );
        e.target.value = '';
        setSelectedVideoFile(null);
        return;
      }
      setSelectedVideoFile(file);
      setSubmitError(null);
    }
  };

  // Submit new learning module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setSubmitError('Please select a course first under which to add the learning module.');
      return;
    }
    if (!moduleTitle.trim()) {
      setSubmitError('Please enter a descriptive title for this learning module.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const formData = new FormData();
    formData.append('course_id', selectedCourseId);
    formData.append('title', moduleTitle.trim());
    if (moduleDescription.trim()) {
      formData.append('description', moduleDescription.trim());
    }
    formData.append('duration_minutes', String(durationMinutes || 20));

    if (selectedSkillCodes.length > 0) {
      formData.append('skills', JSON.stringify(selectedSkillCodes));
    }

    if (selectedDocFile) {
      formData.append('document_file', selectedDocFile);
    }

    if (selectedVideoFile) {
      formData.append('video_file', selectedVideoFile);
    }

    if (videoUrlInput.trim()) {
      formData.append('video_url', videoUrlInput.trim());
    }

    formData.append('is_published', String(isPublished));

    try {
      const res = await fetch('/api/v1/trainer/modules/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Upload failed with status ${res.status}`);
      }

      const newModule: TrainerCourseModuleItem = await res.json();
      setSubmitSuccess(
        `Learning Module #${newModule.module_number} ('${newModule.title}') successfully added under ${newModule.course_code} and published to learners!`
      );

      // Reset form
      setModuleTitle('');
      setModuleDescription('');
      setSelectedDocFile(null);
      setSelectedVideoFile(null);
      setVideoUrlInput('');
      setSelectedSkillCodes([]);

      // Refresh course modules and documents
      fetchModulesForCourse(selectedCourseId);
      const docsRes = await fetch('/api/v1/trainer/documents', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setDocuments(dData);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create learning module');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublishModule = async (moduleId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'unpublish' : 'publish';
      const res = await fetch(`/api/v1/trainer/modules/${moduleId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        setCourseModules((prev) =>
          prev.map((m) => (m.id === moduleId ? { ...m, is_published: !currentStatus } : m))
        );
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error changing module status');
    }
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete module '${title}'?`)) return;
    try {
      const res = await fetch(`/api/v1/trainer/modules/${moduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        setCourseModules((prev) => prev.filter((m) => m.id !== moduleId));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting module');
    }
  };

  const handleDeleteDoc = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete '${docTitle}'?`)) return;
    try {
      const res = await fetch(`/api/v1/trainer/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting document');
    }
  };

  const filteredCompetencies = competencies.filter(
    (c) =>
      c.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(skillSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* ==================================================================== */}
      {/* 1. LOGICAL LEARNING MODULE ADDITION FORM                             */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Curriculum Builder</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Add New Learning Module Under Course
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select a target course, provide module curriculum notes, select multiple evaluated skills in advance,
            upload supporting video, and attach official learning materials. Published modules become immediately available to learners.
          </p>
        </div>

        <form onSubmit={handleCreateModule} className="space-y-6">
          {/* STEP A: SELECT COURSE FIRST */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>1. Select Course First *</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
                  {courses.length} Available Courses
                </span>
                {selectedCourse && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-mono font-medium border border-cyan-200 dark:border-cyan-800">
                    {selectedCourse.code} • {selectedCourse.duration_hours}h
                  </span>
                )}
              </div>
            </div>

            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={isSubmitting || loading}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500 shadow-sm transition"
            >
              <option value="">-- Select an available course from catalog --</option>
              {courses
                .slice()
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.title} — {c.provider} ({c.duration_hours}h)
                  </option>
                ))}
            </select>

            {selectedCourse ? (
              <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">Provider:</span>
                  <span>{selectedCourse.provider}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Duration:</span>
                  <span>{selectedCourse.duration_hours} Hours</span>
                  {selectedCourse.target_role && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-slate-900 dark:text-white">Target Domain:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-medium">{selectedCourse.target_role}</span>
                    </>
                  )}
                </div>
                {selectedCourse.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pt-0.5">
                    {selectedCourse.description}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* STEP B: MODULE TITLE, DESCRIPTION & DURATION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Module Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Module 6: GeM Public Procurement Rules & Vigilance Protocols"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Estimated Duration (Mins)</span>
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                disabled={isSubmitting}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Module Syllabus / Executive Summary Notes
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary of objectives, statutory standard operating procedures, and expected outcomes..."
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {/* STEP C: MULTI-SKILL SELECTION IN ADVANCE */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>2. Select Multiple Skills in Advance</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tag all accredited competencies this learning module covers to map them into the course and learner skill gap radar.
                </p>
              </div>

              {selectedSkillCodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSkillCodes([])}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 self-start sm:self-auto"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Selected ({selectedSkillCodes.length})</span>
                </button>
              )}
            </div>

            {/* Selected Skills Chips */}
            {selectedSkillCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-cyan-200 dark:border-cyan-900/60">
                {selectedSkillCodes.map((code) => {
                  const compObj = competencies.find((c) => c.code === code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center space-x-1 text-[11px] font-semibold text-cyan-800 dark:text-cyan-200 bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-800"
                    >
                      <span>[{code}] {compObj ? compObj.name : code}</span>
                      <button
                        type="button"
                        onClick={() => toggleSkillSelection(code)}
                        className="hover:text-rose-600 dark:hover:text-rose-400 transition ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search Filter for Skills */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search skills by name, code, or domain (e.g. STAT, Analytics, Procurement)..."
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Competency Pills / Selection Grid */}
            <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
              {filteredCompetencies.map((comp) => {
                const isSelected = selectedSkillCodes.includes(comp.code);
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => toggleSkillSelection(comp.code)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 transition ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 shrink-0 text-slate-400" />}
                    <span>
                      <strong className="font-mono">[{comp.code}]</strong> {comp.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP D: SUPPORTING VIDEO & LEARNING DOCUMENT UPLOADS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supporting Video Input Field */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Video className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>3. Upload Supporting Video for Module *</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload single video file (MP4, WebM, MOV) or enter a video stream URL.
              </p>

              <div>
                <input
                  type="file"
                  accept="video/*,.mp4,.webm,.mov"
                  onChange={handleVideoFileChange}
                  disabled={isSubmitting}
                  className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-100 file:text-cyan-800 dark:file:bg-cyan-950 dark:file:text-cyan-300 hover:file:bg-cyan-200 dark:hover:file:bg-cyan-900 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-2 cursor-pointer transition"
                />
                {selectedVideoFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center space-x-1">
                    <Film className="w-3 h-3" />
                    <span>Selected: {selectedVideoFile.name} ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </p>
                )}
              </div>

              <div className="pt-1">
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  Or Video Stream / URL:
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://commondatastorage.googleapis.com/.../sample.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Learning Material Document Upload */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <FileUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>4. Upload Document as Learning Material</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload official notes, syllabus manual, or SOP (PDF, TXT, MD up to 15MB). Automatically chunked for RAG.
              </p>

              <div>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleDocFileChange}
                  disabled={isSubmitting}
                  className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-100 file:text-cyan-800 dark:file:bg-cyan-950 dark:file:text-cyan-300 hover:file:bg-cyan-200 dark:hover:file:bg-cyan-900 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-2 cursor-pointer transition"
                />
                {selectedDocFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center space-x-1">
                    <FileCheck className="w-3 h-3" />
                    <span>Selected: {selectedDocFile.name} ({(selectedDocFile.size / 1024).toFixed(1)} KB)</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="publishToggle"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="publishToggle" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Publish to all learners immediately upon addition
                </label>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {submitError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              * Module will be appended into course curriculum and displayed in Learner Portal.
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !selectedCourseId || !moduleTitle}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing & Publishing Module...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Module to Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================================== */}
      {/* 2. COURSE MODULES CURRICULUM LIST                                    */}
      {/* ==================================================================== */}
      {selectedCourse && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Modules Inside Course: [{selectedCourse.code}] {selectedCourse.title}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Displays both default curriculum modules and custom modules added by faculty.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono font-medium">
              {courseModules.length + 5} Total Modules
            </span>
          </div>

          {loadingModules ? (
            <div className="flex items-center justify-center p-8 text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
              <span className="text-xs ml-2">Loading modules...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Default Foundation Modules Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-slate-400" />
                  <span>Standard iGOT Karmayogi Flagship Video Modules (Modules 1 to 5)</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  5 Core Video Modules Live
                </span>
              </div>

              {/* Custom Added Modules */}
              {courseModules.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-3 text-center">
                  No additional custom learning modules added to this course yet. Use the form above to add Module 6!
                </p>
              ) : (
                courseModules.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                          Module {m.module_number}:
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.title}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            m.is_published
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {m.is_published ? 'Live to Learners' : 'Draft'}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {m.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{m.duration_minutes} mins</span>
                        </span>
                        {m.video_url && (
                          <span className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-medium">
                            <Video className="w-3 h-3" />
                            <span>Supporting Video Attached</span>
                          </span>
                        )}
                        {m.document_title && (
                          <span className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
                            <FileText className="w-3 h-3 text-cyan-500" />
                            <span>Doc: {m.document_title}</span>
                          </span>
                        )}
                        {m.skills_covered && m.skills_covered.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>Skills: {m.skills_covered.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => handleTogglePublishModule(m.id, m.is_published)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1 ${
                          m.is_published
                            ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 shadow-sm'
                        }`}
                        title={m.is_published ? 'Unpublish from learners' : 'Publish to learners'}
                      >
                        {m.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{m.is_published ? 'Unpublish' : 'Publish to Learners'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteModule(m.id, m.title)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                        title="Delete Module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. UPLOADED KNOWLEDGE BASE DOCUMENTS TABLE                           */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Ingested Training Documents & Knowledge Chunks</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
            <p className="text-xs">Loading training documents...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
            No documents ingested yet. Upload training material above to begin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-3 py-3">Format</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Chunks</th>
                  <th className="px-3 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div>
                        <span className="block">{doc.title}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{doc.file_name}</span>
                          {doc.competency_name && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-cyan-800 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.5 rounded">
                              <Award className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                              <span>{doc.competency_code ? `${doc.competency_code}: ` : ''}{doc.competency_name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {doc.mime_type.split('/').pop()}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          doc.status === 'processed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : doc.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-900 dark:text-white">
                      {doc.chunk_count}
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {doc.status === 'processed' && onSelectForQuizGeneration && (
                        <button
                          onClick={() => onSelectForQuizGeneration(doc.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Quiz</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

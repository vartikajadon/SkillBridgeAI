import React, { useEffect, useState } from 'react';
import { TrainerDocumentItem, TrainerQuizDetailResponse } from '../../types/trainer';
import {
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  initialDocumentId?: string | null;
  onQuizGenerated: (quiz: TrainerQuizDetailResponse) => void;
}

const GOV_ROLES = [
  { code: 'DATA_ANALYST', title: 'Data Analyst', department: 'MoSPI / Planning Dept', defaultComp: 'STAT_ANALYSIS' },
  { code: 'BUSINESS_ANALYST', title: 'Business Analyst', department: 'NeGD / MeitY', defaultComp: 'STAKEHOLDER_MGMT' },
  { code: 'FINANCE_ASSISTANT', title: 'Finance Assistant', department: 'Dept of Expenditure / MoF', defaultComp: 'GOV_COMPLIANCE' },
  { code: 'GENERAL', title: 'General Civil Service', department: 'All Cadres', defaultComp: 'GOV_COMPLIANCE' },
];

const COMPETENCY_OPTIONS = [
  { code: 'GOV_COMPLIANCE', name: 'Government Data Ethics & Compliance' },
  { code: 'STAT_ANALYSIS', name: 'Statistical Data Analysis' },
  { code: 'SQL_DATABASE', name: 'Relational Database & SQL Querying' },
  { code: 'DATA_VIZ', name: 'Public Data Visualization & Dashboards' },
  { code: 'POLICY_WRITING', name: 'Briefing Note & Policy Report Writing' },
  { code: 'SURVEY_METHOD', name: 'Field Survey Methodology & Sampling' },
  { code: 'AI_GOVERNANCE', name: 'AI Literacy & Public Sector Automation' },
  { code: 'DIGITAL_LITERACY', name: 'Digital Workplace Tools & E-Office Systems' },
  { code: 'CYBERSECURITY', name: 'Cybersecurity Awareness & Public Data Protection' },
  { code: 'COMMUNICATION', name: 'Civil Service Communication & Citizen Engagement' },
  { code: 'LEADERSHIP', name: 'Public Sector Leadership & Strategic Decision Making' },
];

export const QuizGenerationStudio: React.FC<Props> = ({
  sessionToken,
  initialDocumentId,
  onQuizGenerated,
}) => {
  const [documents, setDocuments] = useState<TrainerDocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);

  // Form State
  const [targetRole, setTargetRole] = useState<string>('DATA_ANALYST');
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || '');
  const [title, setTitle] = useState<string>('');
  const [competencyCode, setCompetencyCode] = useState<string>('STAT_ANALYSIS');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<number>(3);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(60);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoadingDocs(true);
      try {
        const res = await fetch('/api/v1/trainer/documents', {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        if (res.ok) {
          const data: TrainerDocumentItem[] = await res.json();
          const processed = data.filter((d) => d.status === 'processed');
          setDocuments(processed);
          if (!selectedDocId && processed.length > 0) {
            setSelectedDocId(processed[0].id);
          }
        }
      } catch {
        // Ignored
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [sessionToken]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setError('Please select an ingested document source.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const payload = {
      document_id: selectedDocId,
      title: title.trim() || `Diagnostic Assessment: ${competencyCode.replace(/_/g, ' ')}`,
      competency_code: competencyCode,
      question_count: questionCount,
      difficulty_level: difficultyLevel,
      total_marks: totalMarks,
      passing_marks: passingMarks,
    };

    try {
      const res = await fetch('/api/v1/trainer/quizzes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Quiz generation failed with status ${res.status}`);
      }

      const generatedQuiz: TrainerQuizDetailResponse = await res.json();
      onQuizGenerated(generatedQuiz);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating assessment');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border border-cyan-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI Assessment Synthesis Studio</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Synthesize Competency Diagnostic Quizzes</h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Select an official government manual or circular. The AI engine extracts factual clauses to draft grounded multiple-choice questions with answer rubrics and explanations.
          </p>
        </div>
      </div>

      {/* Form */}
      {loadingDocs ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
          <p className="text-xs font-medium">Checking available knowledge base documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Processed Documents Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please upload a PDF or text manual in the Document Management tab first.
          </p>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Source Document Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              1. Select Source Document *
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.file_name} • {d.chunk_count} chunks)
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              2. Assessment Title
            </label>
            <input
              type="text"
              placeholder="e.g. GeM Public Procurement Baseline Diagnostic"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Target Government Role */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              3. Target Government Employee Role *
            </label>
            <select
              value={targetRole}
              onChange={(e) => {
                const r = e.target.value;
                setTargetRole(r);
                const roleObj = GOV_ROLES.find((gr) => gr.code === r);
                if (roleObj && roleObj.defaultComp) {
                  setCompetencyCode(roleObj.defaultComp);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition font-medium"
            >
              {GOV_ROLES.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.title} — {role.department}
                </option>
              ))}
            </select>
          </div>

          {/* Target Competency */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              4. Target Public Sector Competency *
            </label>
            <select
              value={competencyCode}
              onChange={(e) => setCompetencyCode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
            >
              {COMPETENCY_OPTIONS.map((comp) => (
                <option key={comp.code} value={comp.code}>
                  {comp.name} [{comp.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Question Count: {questionCount} MCQs</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Standard diagnostic range: 3–10 questions
              </span>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Difficulty Level: Level {difficultyLevel}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Proficiency Level 1 (Foundational) to Level 5 (Mastery)
              </span>
            </div>
          </div>

          {/* Scoring Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 100)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Passing Marks</label>
              <input
                type="number"
                value={passingMarks}
                onChange={(e) => setPassingMarks(parseInt(e.target.value, 10) || 60)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Generated quizzes are saved as <strong>Draft</strong> for trainer review prior to publication.
            </span>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing MCQs with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Assessment Draft</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

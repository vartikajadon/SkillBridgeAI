import React, { useState } from 'react';
import { QuizQuestion, TrainerQuizDetailResponse } from '../../types/trainer';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Loader2,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';

interface Props {
  quiz: TrainerQuizDetailResponse;
  sessionToken: string;
  onSaved: (updatedQuiz: TrainerQuizDetailResponse) => void;
  onPublished: () => void;
  onBack: () => void;
}

export const QuizEditor: React.FC<Props> = ({
  quiz,
  sessionToken,
  onSaved,
  onPublished,
  onBack,
}) => {
  const [title, setTitle] = useState<string>(quiz.title);
  const [passingMarks, setPassingMarks] = useState<number>(quiz.passing_marks);
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions);
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePromptChange = (idx: number, newPrompt: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], prompt: newPrompt };
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, newText: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIdx].options];
      newOpts[optIdx] = newText;
      copy[qIdx] = { ...copy[qIdx], options: newOpts };
      return copy;
    });
  };

  const handleCorrectIndexChange = (qIdx: number, newCorrectIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correct_index: newCorrectIdx };
      return copy;
    });
  };

  const handleExplanationChange = (qIdx: number, newExpl: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], explanation: newExpl };
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      title: title.trim(),
      total_marks: totalMarks,
      passing_marks: passingMarks,
      questions,
    };

    try {
      const res = await fetch(`/api/v1/trainer/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Save failed with status ${res.status}`);
      }

      const updated: TrainerQuizDetailResponse = await res.json();
      setSuccessMsg('Quiz changes saved successfully.');
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm(`Are you sure you want to publish '${title}'? Once published, it will be immediately active for all civil service learners.`)) {
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // Auto-save first
      await fetch(`/api/v1/trainer/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          total_marks: totalMarks,
          passing_marks: passingMarks,
          questions,
        }),
      });

      const res = await fetch(`/api/v1/trainer/quizzes/${quiz.id}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Publish failed with status ${res.status}`);
      }

      onPublished();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error publishing quiz');
      setIsPublishing(false);
    }
  };

  const isDraft = quiz.status === 'draft';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition"
            title="Return to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  quiz.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : quiz.status === 'draft'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
              >
                {quiz.status} Status
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {questions.length} Questions • {totalMarks} Marks
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={isSaving || isPublishing}
            className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          {isDraft && (
            <button
              onClick={handlePublish}
              disabled={isSaving || isPublishing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Publish Assessment</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Basic Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Assessment Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assessment Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Passing Marks</label>
            <input
              type="number"
              value={passingMarks}
              onChange={(e) => setPassingMarks(parseInt(e.target.value, 10) || 60)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Questions Bank List */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Question Bank & Answer Rubrics</span>
        </h3>

        {questions.map((q, qIdx) => {
          return (
            <div
              key={q.id || qIdx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 text-xs font-bold flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {q.competency_code}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>Points: {q.points}</span>
                  <span>•</span>
                  <span>Difficulty: Level {q.difficulty_level}</span>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Question Prompt
                </label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => handlePromptChange(qIdx, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* 4 Options with Radio Select */}
              <div className="space-y-2.5">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Multiple Choice Options (Select radio for correct answer)
                </label>
                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.correct_index === optIdx;
                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center space-x-3 p-3 rounded-xl border transition ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-600'
                          : 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct_radio_${qIdx}`}
                        checked={isCorrect}
                        onChange={() => handleCorrectIndexChange(qIdx, optIdx)}
                        className="accent-emerald-500 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {letter}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        className="flex-1 bg-transparent border-0 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                      {isCorrect && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700 font-semibold shrink-0">
                          Correct Key
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation / Learning Rubric */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Learning Explanation / Source Citation</span>
                </label>
                <textarea
                  rows={2}
                  value={q.explanation || ''}
                  onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500 transition"
                  placeholder="Citation from official circular explaining correct answer..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

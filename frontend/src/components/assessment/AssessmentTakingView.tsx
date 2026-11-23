import React, { useEffect, useState } from 'react';
import {
  AssessmentDetailResponse,
  AssessmentResultResponse,
  AssessmentSubmitRequest,
  SanitizedQuestion,
} from '../../types/assessment';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Flag,
  HelpCircle,
  Loader2,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';

interface Props {
  quizId: string;
  sessionToken: string;
  onBack: () => void;
  onSubmitted: (result: AssessmentResultResponse) => void;
}

export const AssessmentTakingView: React.FC<Props> = ({
  quizId,
  sessionToken,
  onBack,
  onSubmitted,
}) => {
  const [quiz, setQuiz] = useState<AssessmentDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/v1/assessment/${quizId}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to load assessment questions (${res.status})`);
        }
        const data: AssessmentDetailResponse = await res.json();
        setQuiz(data);

        // Initialize empty answers map
        const initialAnswers: Record<string, number | null> = {};
        data.questions.forEach((q) => {
          initialAnswers[q.id] = null;
        });
        setAnswers(initialAnswers);
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizId, sessionToken]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quiz || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: AssessmentSubmitRequest = {
      answers,
    };

    try {
      const res = await fetch(`/api/v1/assessment/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const detailMsg = errorData?.detail || `Submission failed with status ${res.status}`;
        throw new Error(detailMsg);
      }

      const result: AssessmentResultResponse = await res.json();
      setShowConfirmModal(false);
      onSubmitted(result);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error submitting assessment');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Securing questions and loading assessment environment...</p>
      </div>
    );
  }

  if (fetchError || !quiz) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-200 space-y-4 max-w-xl mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <h3 className="text-base font-bold">Assessment Unavailable</h3>
        <p className="text-xs text-rose-300">{fetchError || 'Unable to retrieve questions'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Return to Catalogue
        </button>
      </div>
    );
  }

  const currentQ: SanitizedQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.values(answers).filter((val) => val !== null).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flagged.size;
  const currentAnswer = answers[currentQ.id];
  const isFlagged = flagged.has(currentQ.id);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            title="Exit assessment"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">{quiz.title}</h1>
            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{totalQuestions} Questions</span>
              <span>•</span>
              <span>{quiz.duration_minutes} Mins Duration</span>
              <span>•</span>
              <span>Passing: {quiz.passing_marks}/{quiz.total_marks} Marks</span>
            </div>
          </div>
        </div>

        {/* Progress & Submit */}
        <div className="flex items-center space-x-4">
          <div className="text-right text-xs">
            <div className="text-slate-700 dark:text-slate-300 font-medium">
              Progress: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{answeredCount}</span>/{totalQuestions}
            </div>
            {flaggedCount > 0 && (
              <div className="text-amber-600 dark:text-amber-400 text-[11px] flex items-center justify-end space-x-1">
                <Flag className="w-3 h-3" />
                <span>{flaggedCount} marked for review</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Question + Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Question Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono border border-slate-200 dark:border-slate-700">
                  {currentQ.competency_code}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 font-medium">
                  {currentQ.points} {currentQ.points === 1 ? 'Mark' : 'Marks'}
                </span>
              </div>

              <button
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                  isFlagged
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400' : ''}`} />
                <span>{isFlagged ? 'Flagged for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            {/* Prompt */}
            <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              {currentQ.prompt}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((optionText, optIdx) => {
                const isSelected = currentAnswer === optIdx;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border flex items-start space-x-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm leading-relaxed">{optionText}</span>
                  </button>
                );
              })}
            </div>

            {/* Clear Selection */}
            {currentAnswer !== null && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleSelectOption(currentQ.id, null as unknown as number)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Bottom Nav Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-2"
              >
                <span>Finish & Submit</span>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Question Palette
            </h3>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => {
                const isAns = answers[q.id] !== null && answers[q.id] !== undefined;
                const isFlg = flagged.has(q.id);
                const isCurr = idx === currentIndex;

                let btnBg = 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
                if (isAns) {
                  btnBg = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 font-semibold';
                }
                if (isFlg) {
                  btnBg = 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-300 font-semibold';
                }
                if (isCurr) {
                  btnBg += ' ring-2 ring-indigo-500';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg border text-xs flex items-center justify-center transition relative ${btnBg}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlg && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-500" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-500" />
                <span>Flagged for Review ({flaggedCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center justify-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Complete Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit Assessment</h3>
              </div>
              <button
                onClick={() => !isSubmitting && setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                You are about to submit your diagnostic assessment for official grading and competency ledger updating.
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Answered</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{answeredCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Unanswered</span>
                  <span className={`font-bold text-base ${unansweredCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                    {unansweredCount}
                  </span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <span className="text-[11px]">
                    Warning: You have {unansweredCount} unanswered questions. Unanswered questions receive 0 marks.
                  </span>
                </div>
              )}

              {submitError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-[11px]">
                  {submitError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Grading & Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm Submission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

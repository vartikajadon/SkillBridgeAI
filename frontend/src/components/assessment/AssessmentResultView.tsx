import React from 'react';
import { AssessmentResultResponse } from '../../types/assessment';
import {
  Award,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  BarChart3,
  Check,
  X,
  Target,
  Zap,
  Info,
} from 'lucide-react';

interface Props {
  result: AssessmentResultResponse;
  onViewGapAnalysis: () => void;
  onBackToCatalogue: () => void;
}

export const AssessmentResultView: React.FC<Props> = ({
  result,
  onViewGapAnalysis,
  onBackToCatalogue,
}) => {
  return (
    <div className="space-y-8">
      {/* Score Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden ${
          result.passed
            ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-800/80'
            : 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-800/80'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border flex items-center space-x-1.5 ${
                  result.passed
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                {result.passed ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Assessment Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Passing Criteria Not Met</span>
                  </>
                )}
              </span>
              <span className="text-xs text-slate-400">
                Submitted on {new Date(result.submitted_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{result.quiz_title}</h1>
            <p className="text-xs text-slate-300">
              Evaluation completed. Your verified competency levels have been committed to your skill ledger.
            </p>
          </div>

          <div className="flex items-center space-x-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800 shrink-0">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Final Score</span>
              <div className="text-2xl font-black text-white">
                {result.total_score} <span className="text-sm font-normal text-slate-400">/ {result.max_score}</span>
              </div>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <span className="text-[11px] text-slate-400 block font-medium">Percentage</span>
              <div
                className={`text-2xl font-black ${
                  result.passed ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.percentage.toFixed(1)}%
              </div>
            </div>
            <div className="border-l border-slate-800 pl-6 text-[11px] text-slate-400">
              <div>Pass Mark: {result.passing_marks}</div>
              <div>Questions: {result.questions.length}</div>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackToCatalogue}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Catalogue</span>
          </button>

          <button
            onClick={onViewGapAnalysis}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>View Competency Gap Radar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Competency Level Progression Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Competency-Wise Diagnostic Results</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.competency_results.map((comp) => {
            return (
              <div
                key={comp.competency_code}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{comp.competency_name}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{comp.competency_code}</span>
                  </div>
                  {comp.is_strength ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>Strength</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold flex items-center space-x-1">
                      <Target className="w-3 h-3" />
                      <span>Priority</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-xs text-slate-300 bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Performance</span>
                    <span className="font-bold text-white">
                      {comp.percentage.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({comp.earned_points}/{comp.total_points} pts)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Level</span>
                    <span className="font-bold text-indigo-300 text-sm">
                      Level {comp.current_level}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Proficiency 1–5</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target / Gap</span>
                    <span className="font-bold text-white">
                      L{comp.target_level ?? '—'} /{' '}
                      <span className={comp.gap_score && comp.gap_score > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {comp.gap_score !== null ? `Gap ${comp.gap_score}` : '—'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">{comp.criticality || 'Standard'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Question Review */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Info className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Question-by-Question Evaluation</h2>
        </div>

        <div className="space-y-4">
          {result.questions.map((q, idx) => {
            return (
              <div
                key={q.question_id}
                className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 transition ${
                  q.is_correct
                    ? 'border-emerald-900/60 shadow-emerald-950/20'
                    : 'border-rose-900/60 shadow-rose-950/20'
                }`}
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        q.is_correct
                          ? 'bg-emerald-900/80 text-emerald-200'
                          : 'bg-rose-900/80 text-rose-200'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {q.competency_code}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1 ${
                        q.is_correct
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {q.is_correct ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Correct (+{q.points_earned} pts)</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          <span>Incorrect (0/{q.max_points} pts)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Prompt */}
                <div className="text-sm sm:text-base font-medium text-slate-100">
                  {q.prompt}
                </div>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((optText, optIdx) => {
                    const isSelected = q.selected_index === optIdx;
                    const isCorrect = q.correct_index === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    let cardClass = 'bg-slate-950/40 border-slate-800 text-slate-400';
                    if (isCorrect) {
                      cardClass = 'bg-emerald-950/40 border-emerald-600 text-emerald-200 font-medium';
                    } else if (isSelected && !isCorrect) {
                      cardClass = 'bg-rose-950/40 border-rose-600 text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${cardClass}`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isSelected
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {letter}
                          </span>
                          <span>{optText}</span>
                        </div>

                        <div className="flex items-center space-x-1 text-[10px] font-semibold shrink-0">
                          {isCorrect && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                              Correct Answer
                            </span>
                          )}
                          {isSelected && (
                            <span
                              className={`px-1.5 py-0.5 rounded border ${
                                isCorrect
                                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                                  : 'bg-rose-900/60 text-rose-300 border-rose-700'
                              }`}
                            >
                              Your Choice
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                      Explanation / Learning Note
                    </span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { TrainerQuizListItem } from '../../types/trainer';
import {
  Award,
  Edit3,
  FileQuestion,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';

interface Props {
  sessionToken: string;
  onEditQuiz: (quizId: string) => void;
  onCreateNew: () => void;
}

export const TrainerQuizList: React.FC<Props> = ({
  sessionToken,
  onEditQuiz,
  onCreateNew,
}) => {
  const [quizzes, setQuizzes] = useState<TrainerQuizListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

  const fetchQuizzes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/trainer/quizzes', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load quizzes (${res.status})`);
      }
      const data: TrainerQuizListItem[] = await res.json();
      setQuizzes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [sessionToken]);

  const handlePublish = async (quizId: string, title: string) => {
    if (!window.confirm(`Publish '${title}'? This will make the assessment immediately available to civil service learners.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/trainer/quizzes/${quizId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to publish quiz');
      }

      setQuizzes((prev) =>
        prev.map((q) => (q.id === quizId ? { ...q, status: 'published' } : q))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error publishing quiz');
    }
  };

  const handleDeleteOrArchive = async (quizId: string, title: string) => {
    if (!window.confirm(`Delete or archive '${title}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/trainer/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete/archive quiz');
      }

      const resData = await res.json();
      if (resData.status === 'archived') {
        alert(resData.message);
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, status: 'archived' } : q))
        );
      } else {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting quiz');
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (filter === 'all') return true;
    return q.status.toLowerCase() === filter;
  });

  const draftCount = quizzes.filter((q) => q.status === 'draft').length;
  const publishedCount = quizzes.filter((q) => q.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border border-cyan-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Assessment Authoring & Publishing</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Curated Diagnostic Quizzes</h1>
            <p className="text-xs text-slate-300">
              Manage draft rubrics, review AI-generated questions, and publish approved evaluations to the civil service catalogue.
            </p>
          </div>

          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Assessment</span>
          </button>
        </div>
      </div>

      {/* KPI & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            All Quizzes ({quizzes.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            Drafts in Review ({draftCount})
          </button>
          <button
            onClick={() => setFilter('published')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'archived'
                ? 'bg-slate-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
            <p className="text-xs">Loading authored assessments...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            {error}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileQuestion className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Quizzes Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No assessments match the selected filter. Click 'Generate New Assessment' to create one from ingested documents.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Assessment Title</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Competency</th>
                  <th className="px-3 py-3.5">Questions</th>
                  <th className="px-3 py-3.5">Marks</th>
                  <th className="px-3 py-3.5">Learner Attempts</th>
                  <th className="px-3 py-3.5">Pass Rate</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredQuizzes.map((quiz) => {
                  const isDraft = quiz.status === 'draft';
                  const isPublished = quiz.status === 'published';

                  return (
                    <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white flex items-center space-x-2">
                        <FileQuestion className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <div>
                          <span>{quiz.title}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : isDraft
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {quiz.competency_code || 'General'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-slate-900 dark:text-white">
                        {quiz.question_count}
                      </td>
                      <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400">
                        Pass: {quiz.passing_marks}/{quiz.total_marks}
                      </td>
                      <td className="px-3 py-3.5 text-slate-800 dark:text-slate-300 font-semibold">
                        {quiz.attempts_count}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={quiz.pass_rate >= 60 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                          {quiz.attempts_count > 0 ? `${quiz.pass_rate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {isDraft && (
                          <button
                            onClick={() => handlePublish(quiz.id, quiz.title)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Publish</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEditQuiz(quiz.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1 shadow-sm"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          <span>Review & Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOrArchive(quiz.id, quiz.title)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                          title="Delete or Archive Quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

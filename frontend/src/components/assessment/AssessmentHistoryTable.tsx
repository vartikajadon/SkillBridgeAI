import React, { useEffect, useState } from 'react';
import { AssessmentHistoryItem } from '../../types/assessment';
import { CheckCircle, Clock, FileQuestion, History, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  sessionToken: string;
}

export const AssessmentHistoryTable: React.FC<Props> = ({ sessionToken }) => {
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/assessment/history', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load assessment history (${res.status})`);
      }
      const data: AssessmentHistoryItem[] = await res.json();
      setHistory(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sessionToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-sm">Loading historical evaluation ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-200 space-y-3">
        <p className="font-semibold text-sm">Failed to retrieve historical assessments</p>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={fetchHistory}
          className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 rounded-md text-xs font-medium text-white transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <History className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-semibold text-slate-200">No Assessment History Found</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          You have not completed any diagnostic evaluations yet. Begin an assessment from the catalogue to establish your skill competency baseline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Assessment Attempt History</h2>
        </div>
        <span className="text-xs text-slate-400">
          {history.length} {history.length === 1 ? 'Attempt' : 'Attempts'} Logged
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Assessment Title</th>
              <th className="px-4 py-3.5">Completed At</th>
              <th className="px-4 py-3.5">Score</th>
              <th className="px-4 py-3.5">Percentage</th>
              <th className="px-4 py-3.5">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {history.map((item) => {
              const compDate = item.completed_at
                ? new Date(item.completed_at).toLocaleString()
                : 'In Progress';
              return (
                <tr key={item.attempt_id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5 font-medium text-white flex items-center space-x-2">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{item.quiz_title}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{compDate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-white">
                    {item.score} pts
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`font-bold ${
                        item.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        item.passed
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {item.passed ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Passed</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Not Met</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

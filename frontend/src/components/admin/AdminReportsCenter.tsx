import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AdminReportsCenterProps {
  sessionToken: string;
}

interface ReportCardDef {
  id: string;
  endpoint: string;
  title: string;
  description: string;
  supportsDeptFilter?: boolean;
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    id: 'platform-overview',
    endpoint: '/api/v1/reports/platform-overview',
    title: 'Platform Governance & Capacity Overview',
    description: 'Executive capacity audit covering course catalogue, enrollment funnels, and global completion rates.',
  },
  {
    id: 'department-summary',
    endpoint: '/api/v1/reports/department-summary',
    title: 'Departmental Training & Competency Audit',
    description: 'Headcount breakdown, diagnostic assessment coverage, and skill gap indices across government ministries.',
    supportsDeptFilter: true,
  },
  {
    id: 'competency-gaps',
    endpoint: '/api/v1/reports/competency-gaps',
    title: 'Civil Service National Competency Gap Audit',
    description: 'Itemized workforce skill deficit analysis across 12 Technical, Behavioral, and Domain competencies.',
  },
  {
    id: 'learner-transcript',
    endpoint: '/api/v1/reports/learner-transcript',
    title: 'Civil Service Learning Transcript',
    description: 'Official individual verified competency transcript and completion record.',
  },
  {
    id: 'assessment-performance',
    endpoint: '/api/v1/reports/assessment-performance',
    title: 'Assessment Telemetry & Quiz Pass Rate Audit',
    description: 'Itemized evaluation ledger of completed diagnostic attempts, scores, and pass benchmarks.',
  },
];

export const AdminReportsCenter: React.FC<AdminReportsCenterProps> = ({ sessionToken }) => {
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [reportFormats, setReportFormats] = useState<Record<string, 'csv' | 'pdf'>>({
    'platform-overview': 'pdf',
    'department-summary': 'pdf',
    'competency-gaps': 'csv',
    'learner-transcript': 'pdf',
    'assessment-performance': 'csv',
  });
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownload = async (card: ReportCardDef) => {
    setDownloadingReportId(card.id);
    setStatusMsg(null);
    try {
      const format = reportFormats[card.id] || 'csv';
      let url = `${card.endpoint}?format=${format}`;
      if (card.supportsDeptFilter && deptFilter.trim()) {
        url += `&department=${encodeURIComponent(deptFilter.trim())}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Report generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const filenameHeader = res.headers.get('Content-Disposition');
      let filename = `${card.id}_export.${format}`;
      if (filenameHeader && filenameHeader.includes('filename="')) {
        filename = filenameHeader.split('filename="')[1].split('"')[0];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setStatusMsg({
        type: 'success',
        text: `Report "${card.title}" (${format.toUpperCase()}) exported and verified against audit ledger.`,
      });
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error generating report',
      });
    } finally {
      setDownloadingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/80 border border-indigo-900/60 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Government Executive Reports & Audit Center</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Export verifiable ReportLab PDF management summaries and UTF-8 CSV datasets with immutable audit tracking.
          </p>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REPORT_CARDS.map((card) => {
          const isDownloading = downloadingReportId === card.id;
          const currentFormat = reportFormats[card.id] || 'pdf';

          return (
            <div
              key={card.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">{card.title}</h3>
                  <span className="text-[10px] uppercase font-semibold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
              </div>

              {card.supportsDeptFilter && (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Department Scope (Optional):</label>
                  <input
                    type="text"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    placeholder="e.g. Ministry of Statistics"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                {/* Format Toggle */}
                <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setReportFormats((prev) => ({ ...prev, [card.id]: 'pdf' }))}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                      currentFormat === 'pdf'
                        ? 'bg-rose-950 text-rose-300 font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFormats((prev) => ({ ...prev, [card.id]: 'csv' }))}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                      currentFormat === 'csv'
                        ? 'bg-emerald-950 text-emerald-300 font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>

                {/* Download Button */}
                <button
                  disabled={isDownloading}
                  onClick={() => handleDownload(card)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {currentFormat.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

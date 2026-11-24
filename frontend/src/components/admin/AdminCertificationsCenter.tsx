import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface EnrollmentCertificationItem {
  enrollment_id: string;
  user_id: string;
  learner_name: string;
  learner_email: string;
  employee_id: string | null;
  department: string;
  designation: string;
  course_id: string;
  course_code: string;
  course_title: string;
  provider: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string | null;
  completed_at: string | null;
  is_certified: boolean;
  certificate_id: string | null;
}

interface Props {
  sessionToken: string;
}

export const AdminCertificationsCenter: React.FC<Props> = ({ sessionToken }) => {
  const [enrollments, setEnrollments] = useState<EnrollmentCertificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [certifyingId, setCertifyingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchEnrollments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/reports/enrollments', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load enrollments (${res.status})`);
      }
      const data: EnrollmentCertificationItem[] = await res.json();
      setEnrollments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [sessionToken]);

  const handleCertify = async (enr: EnrollmentCertificationItem) => {
    setCertifyingId(enr.enrollment_id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/reports/enrollments/${enr.enrollment_id}/certify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Certification failed (${res.status})`);
      }
      const result = await res.json();
      setSuccessMsg(result.message || `Successfully certified ${enr.learner_name}!`);
      fetchEnrollments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Certification action failed');
    } finally {
      setCertifyingId(null);
    }
  };

  const handleDownloadCertificate = async (enr: EnrollmentCertificationItem) => {
    setDownloadingId(enr.enrollment_id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/enrollments/${enr.enrollment_id}/certificate`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to download certificate (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${enr.course_code}_${enr.learner_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredEnrollments = enrollments.filter((enr) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      enr.learner_name.toLowerCase().includes(query) ||
      (enr.employee_id && enr.employee_id.toLowerCase().includes(query)) ||
      enr.course_title.toLowerCase().includes(query) ||
      enr.course_code.toLowerCase().includes(query) ||
      enr.department.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && enr.status === 'completed') ||
      (statusFilter === 'in_progress' && enr.status !== 'completed');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Course Certifications & Credentials Center</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review civil service employee course progress, approve formal certifications, and issue authenticated DoPT / Mission Karmayogi completion credentials.
          </p>
        </div>
        <button
          onClick={fetchEnrollments}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by learner name, employee ID, or course title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Statuses ({enrollments.length})</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Certified / Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading course enrollments and certificates...</p>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs italic">
            No learner enrollments matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Learner Officer</th>
                  <th className="px-4 py-3">Course Curriculum</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Certificate ID</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredEnrollments.map((enr) => {
                  const isCertifying = certifyingId === enr.enrollment_id;
                  const isDownloading = downloadingId === enr.enrollment_id;
                  return (
                    <tr key={enr.enrollment_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{enr.learner_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {enr.employee_id ? `ID: ${enr.employee_id}` : enr.learner_email} • {enr.department}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-white">{enr.course_title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {enr.course_code} • {enr.provider}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-1 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              enr.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, enr.progress_percentage))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {enr.progress_percentage}%
                        </span>
                      </td>

                      <td className="px-3 py-3.5">
                        {enr.status === 'completed' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Certified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 font-mono text-[11px]">
                        {enr.certificate_id ? (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/80">
                            {enr.certificate_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Pending Completion</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {enr.status !== 'completed' ? (
                            <button
                              onClick={() => handleCertify(enr)}
                              disabled={isCertifying}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1"
                            >
                              {isCertifying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                              <span>Certify Learner</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDownloadCertificate(enr)}
                              disabled={isDownloading}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-1.5"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>Certificate (PDF)</span>
                            </button>
                          )}
                        </div>
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

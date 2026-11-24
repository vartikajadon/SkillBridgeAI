import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminOverviewCharts } from '../../components/admin/AdminOverviewCharts';
import { AdminUserDirectory } from '../../components/admin/AdminUserDirectory';
import { AdminCertificationsCenter } from '../../components/admin/AdminCertificationsCenter';
import {
  Award,
  BarChart3,
  Users,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
type AdminTab = 'overview' | 'users' | 'certifications' | 'audit';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  created_at: string;
}

export const AdminPortal: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const token = session?.access_token || '';

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      setLoadingAudit(true);
      setAuditError(null);
      const res = await fetch('/api/v1/dashboard/admin', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch audit logs (${res.status})`);
      }
      const data = await res.json();
      setAuditLogs(data.recent_audit_logs || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setAuditError(errorMsg);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'audit' && auditLogs.length === 0) {
      fetchAuditLogs();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                SkillBridge AI
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-semibold">
                Governance Console
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">National Competency & Executive Telemetry Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.full_name || 'System Administrator'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email} • {user?.department || 'Executive Office'}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 px-6">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('users')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory</span>
          </button>

          <button
            onClick={() => handleTabChange('certifications')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'certifications'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <Award className="w-4 h-4" />
            <span>Course Certifications</span>
          </button>

          <button
            onClick={() => handleTabChange('audit')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>Security Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'overview' && <AdminOverviewCharts sessionToken={token} />}
        {activeTab === 'users' && <AdminUserDirectory sessionToken={token} />}
        {activeTab === 'certifications' && <AdminCertificationsCenter sessionToken={token} />}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Platform Security Audit Logs</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Chronological immutable record of security and administrative actions</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                disabled={loadingAudit}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-sm transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            {auditError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
                {auditError}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                    {loadingAudit && auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                          Loading audit records...
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                          No audit logs found.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-300 whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="text-slate-800 dark:text-slate-300">{log.entity_type}</span>
                            {log.entity_id && (
                              <span className="text-slate-400 dark:text-slate-500 ml-1">({log.entity_id.slice(0, 8)}...)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <div className="flex items-center space-x-1 font-sans">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span>{log.actor_name || log.actor_id.slice(0, 8)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="py-2.5 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400">
                            —
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

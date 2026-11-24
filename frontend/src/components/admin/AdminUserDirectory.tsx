import React, { useEffect, useState } from 'react';
import { UserProfile } from '../../context/AuthContext';
import {
  CheckCircle,
  Download,
  Loader2,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
} from 'lucide-react';

interface AdminUserDirectoryProps {
  sessionToken: string;
}

export const AdminUserDirectory: React.FC<AdminUserDirectoryProps> = ({ sessionToken }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);

  const handleExportLearnerReport = async (u: UserProfile) => {
    setExportingUserId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reports/learner-transcript?user_id=${u.id}&format=pdf`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to generate learner report (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Learner_Report_${u.employee_id || u.full_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingUserId(null);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/admin/users?limit=100', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
      const data: UserProfile[] = await res.json();
      setUsersList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [sessionToken]);

  const handleToggleStatus = async (user: UserProfile) => {
    setUpdatingUserId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/auth/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Action rejected (${res.status})`);
      }

      const updated: UserProfile = await res.json();
      setUsersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSuccessMsg(`Account status for ${user.full_name} updated to ${updated.is_active ? 'Active' : 'Deactivated'}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRoleChange = async (user: UserProfile, newRole: string) => {
    if (user.role === newRole) return;
    setUpdatingUserId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/auth/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Role change rejected (${res.status})`);
      }

      const updated: UserProfile = await res.json();
      setUsersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSuccessMsg(`Role for ${user.full_name} elevated to ${updated.role.toUpperCase()}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Role update failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Distinct departments for filter dropdown
  const departments = Array.from(new Set(usersList.map((u) => u.department).filter(Boolean))) as string[];

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesDept = deptFilter === 'all' || u.department === deptFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'deactivated' && !u.is_active);

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, employee ID..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="learner">Learners</option>
            <option value="trainer">Trainers</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px] truncate"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Accounts</option>
            <option value="deactivated">Deactivated</option>
          </select>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono ml-2">
            {filteredUsers.length} of {usersList.length} users
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex items-center justify-center space-x-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading civil service user directory...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No civil service user accounts match the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="text-[11px] uppercase bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Officer Name & ID</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department / Designation</th>
                  <th className="py-3 px-4">Role Privileges</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
                {filteredUsers.map((u) => {
                  const isUpdating = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ID: {u.employee_id || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{u.department || 'Unassigned'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.designation || 'Officer'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          disabled={isUpdating}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className={`text-xs px-2 py-1 rounded font-semibold border transition ${
                            u.role === 'admin'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              : u.role === 'trainer'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                          }`}
                        >
                          <option value="learner">Learner</option>
                          <option value="trainer">Trainer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            <UserX className="w-3 h-3" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {u.role === 'learner' && (
                            <button
                              disabled={exportingUserId === u.id}
                              onClick={() => handleExportLearnerReport(u)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center space-x-1"
                              title="Export Official Learner Report (PDF)"
                            >
                              {exportingUserId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>Export Report (PDF)</span>
                            </button>
                          )}
                          <button
                            disabled={isUpdating}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                              u.is_active
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/60'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60'
                            }`}
                            title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : u.is_active ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </button>
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

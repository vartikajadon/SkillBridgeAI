import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, UserProfile } from '../../context/AuthContext';
import { Shield, Users, LogOut, User as UserIcon, Loader2 } from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { user, session, logout } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/v1/auth/admin/users', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUsersList(data);
        }
      } catch {
        // Ignored
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-white">SkillBridge AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-medium">
              Administrator Console
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>{user?.full_name}</span>
            </Link>
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" />
            <span>DoPT System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Governance • Role Provisioning & Privileged Access Management
          </p>
        </div>

        {/* User Management Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Civil Service User Directory (Role Management)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {usersList.length} Accounts Registered
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-500 flex items-center justify-center space-x-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading user directory...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Employee ID</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-medium text-white">{u.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : u.role === 'trainer'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{u.department || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{u.employee_id || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={u.is_active ? 'text-emerald-400' : 'text-rose-400'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

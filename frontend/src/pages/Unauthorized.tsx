import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, GraduationCap, ShieldCheck, Loader2 } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleQuickSwitch = async (role: 'trainer' | 'admin', email: string, targetPath: string) => {
    setSwitching(role);
    try {
      const res = await login(email, 'password123');
      if (!res.error) {
        navigate(targetPath, { replace: true });
      }
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 text-center text-slate-100">
      <div className="h-16 w-16 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-900/30">
        <ShieldAlert className="w-8 h-8 text-rose-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">403 — Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-lg leading-relaxed">
        You are currently signed in as{' '}
        <strong className="text-slate-200">{user?.full_name || 'Civil Service Learner'}</strong> (
        <span className="text-indigo-400">{user?.email || 'learner'}</span>).
        This section requires elevated <strong className="text-slate-200">Trainer</strong> or{' '}
        <strong className="text-slate-200">Admin</strong> clearance.
      </p>

      {/* 1-Click Role Switcher Options */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
        <button
          onClick={() =>
            handleQuickSwitch('trainer', 'trainer.sharma@skillbridge.gov.in', '/trainer')
          }
          disabled={switching !== null}
          className="flex items-center justify-start space-x-3 p-3.5 rounded-xl border border-cyan-700/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 text-left text-xs font-semibold transition cursor-pointer"
        >
          {switching === 'trainer' ? (
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
          ) : (
            <GraduationCap className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-white">Switch to Trainer Account</div>
            <div className="text-[11px] text-cyan-300">Dr. Sunita Sharma (3 Screens)</div>
          </div>
        </button>

        <button
          onClick={() =>
            handleQuickSwitch('admin', 'admin@skillbridge.gov.in', '/admin')
          }
          disabled={switching !== null}
          className="flex items-center justify-start space-x-3 p-3.5 rounded-xl border border-indigo-700/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 text-left text-xs font-semibold transition cursor-pointer"
        >
          {switching === 'admin' ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-white">Switch to Admin Account</div>
            <div className="text-[11px] text-indigo-300">Rajesh Kumar (DoPT)</div>
          </div>
        </button>
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={() => navigate('/learner')}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Learner Portal</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getPortalRoute = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'trainer') return '/trainer';
    return '/learner';
  };

  const getPortalName = () => {
    if (!user) return 'Login';
    if (user.role === 'admin') return 'Admin Portal';
    if (user.role === 'trainer') return 'Trainer Portal';
    return 'Learner Portal';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 text-center text-slate-900 dark:text-slate-100">
      <div className="h-16 w-16 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-900/20">
        <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">403 — Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
        You are currently signed in as{' '}
        <strong className="text-slate-900 dark:text-slate-200">{user?.full_name || 'User'}</strong> with the role of{' '}
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
          {user?.role || 'Guest'}
        </span>
        . You only have access to your assigned portal.
      </p>

      <div className="mt-8 flex items-center space-x-4">
        <button
          onClick={() => navigate(getPortalRoute(), { replace: true })}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Go to My {getPortalName()}</span>
        </button>
      </div>
    </div>
  );
};

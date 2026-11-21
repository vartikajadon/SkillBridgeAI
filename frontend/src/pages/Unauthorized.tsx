import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 text-center text-slate-100">
      <div className="h-16 w-16 bg-rose-950/80 border border-rose-800 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-rose-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">403 — Access Restricted</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        Your current civil service role does not have administrative clearance for this section.
      </p>
      <div className="mt-6 flex space-x-4">
        <Link
          to="/learner"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to Learner Portal</span>
        </Link>
      </div>
    </div>
  );
};

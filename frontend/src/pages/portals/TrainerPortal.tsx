import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, FileText, CheckSquare, LogOut, User as UserIcon } from 'lucide-react';

export const TrainerPortal: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-white">SkillBridge AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
              Faculty / Trainer Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
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
        <div className="bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-900/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            <span>Master Faculty Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Academy: {user?.department || 'National Academy'} • Access Tier: Faculty / Curriculum Evaluator
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400">
              <FileText className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-slate-200">Training Document & SOP Ingestion</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload scheme guidelines, administrative circulars, and SOP PDFs for automatic vector chunking and RAG ingestion.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400">
              <CheckSquare className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-slate-200">AI Assessment & Rubric Studio</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesize competency-aligned case-study evaluations, MCQs, and automated grading rubrics.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

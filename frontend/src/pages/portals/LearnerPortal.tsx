import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, UserCheck, Award, LogOut, User as UserIcon } from 'lucide-react';

export const LearnerPortal: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Portal Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-white">SkillBridge AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
              Learner Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-900/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Award className="w-4 h-4" />
            <span>Welcome, Civil Servant</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Department: {user?.department || 'Unassigned'} • Designation: {user?.designation || 'Learner'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400">
              <BookOpen className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-slate-200">Assigned Courses</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Curated training modules from iGOT Karmayogi and national academies tailored to your job role.
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
              Module catalog activation scheduled for Phase 3.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400">
              <UserCheck className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-slate-200">Skill Competency Ledger</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time radar tracking your 8 core competency targets and verified gap scores.
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
              Diagnostic assessment engine scheduled for Phase 3.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Award className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-slate-200">Certificates & Milestones</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official capacity building achievements verified by ministry evaluators.
            </p>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
              Digital certificate records ledger.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

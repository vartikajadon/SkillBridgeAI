import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, ShieldCheck, UserCheck, ChevronDown, Check } from 'lucide-react';

const PORTAL_OPTIONS = [
  {
    role: 'learner',
    title: 'Learner Portal',
    badge: 'Civil Service Learner',
    email: 'learner.patel@skillbridge.gov.in',
    name: 'Amit Patel',
    path: '/learner',
    color: 'emerald',
    icon: UserCheck,
    bgClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    activeClass: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
  },
  {
    role: 'trainer',
    title: 'Trainer Portal (3 Screens)',
    badge: 'Faculty / Master Trainer',
    email: 'trainer.sharma@skillbridge.gov.in',
    name: 'Dr. Sunita Sharma',
    path: '/trainer',
    color: 'cyan',
    icon: GraduationCap,
    bgClass: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
    activeClass: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200',
  },
  {
    role: 'admin',
    title: 'Admin Portal',
    badge: 'System Administrator',
    email: 'admin@skillbridge.gov.in',
    name: 'Rajesh Kumar (DoPT)',
    path: '/admin',
    color: 'indigo',
    icon: ShieldCheck,
    bgClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    activeClass: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200',
  },
];

export const QuickPortalSwitcher: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const currentRole = user?.role || 'learner';
  const currentOption = PORTAL_OPTIONS.find((p) => p.role === currentRole) || PORTAL_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  const handleSwitchPortal = async (option: typeof PORTAL_OPTIONS[0]) => {
    setIsOpen(false);
    if (user?.role === option.role) {
      navigate(option.path);
      return;
    }

    setSwitching(true);
    try {
      const res = await login(option.email, 'password123');
      if (!res.error) {
        navigate(option.path);
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
        title="Switch Public Sector Portal Role"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="hidden sm:inline">Role:</span>
        <span className="font-bold">{currentOption.title}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Switch Public Sector Portal
              </p>
            </div>
            <div className="p-1 space-y-1">
              {PORTAL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = user?.role === opt.role;
                return (
                  <button
                    key={opt.role}
                    onClick={() => handleSwitchPortal(opt)}
                    className={`w-full flex items-start space-x-3 p-2 rounded-lg text-left text-xs transition border ${
                      isSelected
                        ? opt.activeClass
                        : `border-transparent ${opt.bgClass}`
                    }`}
                  >
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {opt.title}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {opt.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

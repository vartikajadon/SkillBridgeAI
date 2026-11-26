import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  ArrowRight,
  Cpu,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const MOCK_ACCOUNTS = [
  {
    role: 'Civil Service Learner',
    badge: 'Learner',
    name: 'Amit Patel',
    designation: 'Statistical Assistant',
    email: 'learner.patel@skillbridge.gov.in',
    portal: '/learner',
    icon: UserCheck,
    theme: {
      card: 'bg-white dark:bg-slate-900/90 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      email: 'text-emerald-700 dark:text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30',
    },
  },
  {
    role: 'Master Trainer / Faculty',
    badge: 'Faculty',
    name: 'Dr. Sunita Sharma',
    designation: 'Curriculum & Assessments',
    email: 'trainer.sharma@skillbridge.gov.in',
    portal: '/trainer',
    icon: GraduationCap,
    theme: {
      card: 'bg-white dark:bg-slate-900/90 border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-md hover:shadow-cyan-500/10',
      iconBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800',
      badge: 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
      email: 'text-cyan-700 dark:text-cyan-400',
      btn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/30',
    },
  },
  {
    role: 'System Administrator',
    badge: 'Director / DoPT',
    name: 'Rajesh Kumar',
    designation: 'Capacity Building & Governance',
    email: 'admin@skillbridge.gov.in',
    portal: '/admin',
    icon: ShieldCheck,
    theme: {
      card: 'bg-white dark:bg-slate-900/90 border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
      email: 'text-indigo-700 dark:text-indigo-400',
      btn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30',
    },
  },
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const getTargetRoute = (targetEmail: string, userRole?: string) => {
    if (userRole === 'admin' || targetEmail.includes('admin')) return '/admin';
    if (userRole === 'trainer' || targetEmail.includes('trainer')) return '/trainer';
    return '/learner';
  };

  const handleLoginWithEmail = async (loginEmail: string, loginPass: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await login(loginEmail, loginPass);
      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
      } else {
        const dest = getTargetRoute(loginEmail);
        navigate(dest, { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
      setActiveQuickEmail(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginWithEmail(email, password);
  };

  const handleQuickLogin = (mockEmail: string) => {
    setActiveQuickEmail(mockEmail);
    setEmail(mockEmail);
    setPassword('password123');
    handleLoginWithEmail(mockEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-150 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SkillBridge <span className="text-indigo-600 dark:text-indigo-400">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Civil Service Portal Login</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sign in with your government email or use quick test credentials</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-8 px-6 shadow-xl dark:shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {/* Quick Mock Credentials Selector */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-indigo-50/20 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Test Credentials</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                1-Click Sign-In
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select any civil service persona below to automatically sign in and explore that role:
            </p>

            <div className="space-y-2.5">
              {MOCK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isLoggingThis = isSubmitting && activeQuickEmail === acc.email;

                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={isSubmitting}
                    className={`w-full group p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between gap-3 ${acc.theme.card}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${acc.theme.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {acc.role}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${acc.theme.badge}`}>
                            {acc.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {acc.name} • <span className="opacity-80">{acc.designation}</span>
                        </div>
                        <div className={`text-[10px] font-mono truncate font-medium ${acc.theme.email}`}>
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all ${acc.theme.btn} ${
                          isSubmitting && !isLoggingThis ? 'opacity-40' : ''
                        }`}
                      >
                        {isLoggingThis ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider shrink-0">
              Or sign in manually
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 p-3 rounded-lg flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Official Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@gov.in"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                For mock accounts, enter password: <span className="font-mono text-slate-700 dark:text-slate-300">password123</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>New civil servant? </span>
            <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Register Learner Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

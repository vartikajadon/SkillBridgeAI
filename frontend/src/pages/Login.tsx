import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Sparkles,
  UserCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

const MOCK_ACCOUNTS = [
  {
    role: 'Civil Service Learner',
    name: 'Amit Patel (Statistical Assistant)',
    email: 'learner.patel@skillbridge.gov.in',
    portal: '/learner',
    color: 'emerald',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    btnColor: 'bg-emerald-900/40 hover:bg-emerald-800/60 border-emerald-700/60 text-emerald-200',
    icon: UserCheck,
  },
  {
    role: 'Master Trainer / Faculty',
    name: 'Dr. Sunita Sharma (Faculty Member)',
    email: 'trainer.sharma@skillbridge.gov.in',
    portal: '/trainer',
    color: 'cyan',
    badge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    btnColor: 'bg-cyan-900/40 hover:bg-cyan-800/60 border-cyan-700/60 text-cyan-200',
    icon: GraduationCap,
  },
  {
    role: 'System Administrator',
    name: 'Rajesh Kumar (Director, DoPT)',
    email: 'admin@skillbridge.gov.in',
    portal: '/admin',
    color: 'indigo',
    badge: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    btnColor: 'bg-indigo-900/40 hover:bg-indigo-800/60 border-indigo-700/60 text-indigo-200',
    icon: ShieldCheck,
  },
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTargetRoute = (targetEmail: string) => {
    const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
    if (fromPath && fromPath !== '/login' && fromPath !== '/') {
      return fromPath;
    }
    if (targetEmail.includes('admin')) return '/admin';
    if (targetEmail.includes('trainer')) return '/trainer';
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginWithEmail(email, password);
  };

  const handleQuickLogin = (mockEmail: string) => {
    setEmail(mockEmail);
    setPassword('password123');
    handleLoginWithEmail(mockEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            SkillBridge <span className="text-indigo-400">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Civil Service Portal Login</h2>
        <p className="mt-1 text-sm text-slate-400">Sign in with your government email or use quick test credentials</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-xl sm:px-10 space-y-6">
          {/* Quick Mock Credentials Selector */}
          <div className="p-4 bg-slate-950/80 border border-indigo-900/60 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Mock Logins (Click to Test)</span>
            </div>
            <div className="space-y-2">
              {MOCK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={isSubmitting}
                    className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between text-xs ${acc.btnColor}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{acc.role}</div>
                        <div className="text-[11px] opacity-80 truncate">{acc.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-slate-950/60 border border-white/10 ml-2">
                      Sign In →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider shrink-0">
              Or sign in manually
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800/80 p-3 rounded-lg flex items-start space-x-2 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300">Official Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@gov.in"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                For mock accounts, enter password: <span className="font-mono text-slate-300">password123</span>
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

          <div className="pt-2 text-center text-xs text-slate-400">
            <span>New civil servant? </span>
            <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
              Register Learner Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

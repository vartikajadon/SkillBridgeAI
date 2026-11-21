import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  LogIn,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRouteGuard } from './components/RoleRouteGuard';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CompleteProfile } from './pages/CompleteProfile';
import { Profile } from './pages/Profile';
import { Unauthorized } from './pages/Unauthorized';
import { LearnerPortal } from './pages/portals/LearnerPortal';
import { TrainerPortal } from './pages/portals/TrainerPortal';
import { AdminPortal } from './pages/portals/AdminPortal';

interface HealthData {
  status: string;
  service: string;
  version: string;
}

const mockReadinessData = [
  { domain: 'System Design', score: 62 },
  { domain: 'Fullstack Eng', score: 78 },
  { domain: 'Cloud & DevOps', score: 55 },
  { domain: 'AI & Data Eng', score: 84 },
  { domain: 'Security & Auth', score: 70 },
];

function LandingPage(): React.JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: HealthData = await response.json();
      setHealth(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to backend service'
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getPortalRoute = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'trainer') return '/trainer';
    return '/learner';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                SkillBridge <span className="text-indigo-400">AI</span>
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Phase 2 RBAC
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <button
                onClick={() => navigate(getPortalRoute())}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm"
              >
                <span>Open {user.role.toUpperCase()} Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Civil Service Competency Platform & RBAC Security
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Bridging Talent to Industry with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Intelligence
            </span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            SkillBridge AI provides automated skill assessments, tailored curricula, and real-time competency telemetry for civil servants.
          </p>

          <div className="flex justify-center items-center space-x-4 pt-2">
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
            >
              <span>Get Started as Learner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-300 transition"
            >
              Portal Login
            </Link>
          </div>
        </div>

        {/* Status & Diagnostic Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-slate-200">Backend Health</h3>
                </div>
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="p-1.5 text-slate-400 hover:text-white rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition"
                  title="Refresh status"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 font-mono text-xs">
                <div className="text-slate-500 mb-1">Target Endpoint:</div>
                <div className="text-indigo-300 font-semibold">
                  GET /api/v1/health
                </div>
              </div>

              {loading ? (
                <div className="flex items-center space-x-2 text-slate-400 py-3 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Probing endpoint...</span>
                </div>
              ) : health ? (
                <div className="space-y-2 py-1">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">Connected & Healthy</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 pl-7">
                    <div>Service: <span className="text-slate-200">{health.service}</span></div>
                    <div>Version: <span className="text-slate-200">{health.version}</span></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">Standby / Unreachable</span>
                  </div>
                  <p className="text-xs text-slate-400 pl-7 leading-relaxed">
                    {error || 'FastAPI backend not detected at 127.0.0.1:8000.'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
              Verified Auth Endpoints active under <span className="text-slate-400 font-mono">/api/v1/auth</span>.
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-200">
                  Telemetry Visualizer (Recharts Preview)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
                Recharts v2
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mockReadinessData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="domain"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Interactive analytics container successfully initialized</span>
              <span className="text-indigo-400">Readiness Baseline Metric</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>SkillBridge AI • Phase 2 Authentication & Role-Based Access Control Complete</p>
      </footer>
    </div>
  );
}

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Profile Completion Recovery */}
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute>
                <CompleteProfile />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Self-Service Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Role-Specific Portals */}
          <Route
            path="/learner/*"
            element={
              <ProtectedRoute>
                <RoleRouteGuard allowedRoles={['learner', 'trainer', 'admin']}>
                  <LearnerPortal />
                </RoleRouteGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/*"
            element={
              <ProtectedRoute>
                <RoleRouteGuard allowedRoles={['trainer', 'admin']}>
                  <TrainerPortal />
                </RoleRouteGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <RoleRouteGuard allowedRoles={['admin']}>
                  <AdminPortal />
                </RoleRouteGuard>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

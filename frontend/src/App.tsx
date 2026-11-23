import React from 'react';
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
  Cpu,
  Sparkles,
  LogIn,
  UserPlus,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Target,
  BarChart3,
  Brain,
  CheckCircle2,
  BookOpen,
  Layers,
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRouteGuard } from './components/RoleRouteGuard';
import { ThemeToggle } from './components/ThemeToggle';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CompleteProfile } from './pages/CompleteProfile';
import { Profile } from './pages/Profile';
import { Unauthorized } from './pages/Unauthorized';

// Route-level code splitting for heavy portal views
const LearnerPortal = React.lazy(() =>
  import('./pages/portals/LearnerPortal').then((m) => ({ default: m.LearnerPortal }))
);
const TrainerPortal = React.lazy(() =>
  import('./pages/portals/TrainerPortal').then((m) => ({ default: m.TrainerPortal }))
);
const AdminPortal = React.lazy(() =>
  import('./pages/portals/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);

const PortalLoadingFallback: React.FC<{ portalName: string }> = ({ portalName }) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
      <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-semibold text-slate-200">Loading {portalName}...</p>
      <p className="text-xs text-slate-400">Preparing official public sector workspace</p>
    </div>
  </div>
);

const mockReadinessData = [
  { domain: 'Official Statistics', score: 74 },
  { domain: 'Workflow & GPR', score: 68 },
  { domain: 'Public Finance (PFMS)', score: 79 },
  { domain: 'Digital Public Infra', score: 86 },
  { domain: 'Governance Analytics', score: 71 },
];

function LandingPage(): React.JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getPortalRoute = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'trainer') return '/trainer';
    return '/learner';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                SkillBridge <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                iGOT Karmayogi Aligned
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {user ? (
              <button
                onClick={() => navigate(getPortalRoute())}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm cursor-pointer"
              >
                <span>Open {user.role.toUpperCase()} Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-indigo-300 text-xs font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            National Competency Telemetry & Public Sector Capacity Building
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Bridging Governance Talent to Public Impact with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:via-cyan-400 dark:to-emerald-400">
              Intelligence
            </span>
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            SkillBridge AI provides automated competency assessments, tailored iGOT Karmayogi learning paths, and real-time public administration telemetry across government departments.
          </p>

          <div className="flex justify-center items-center space-x-4 pt-2">
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition flex items-center space-x-2"
            >
              <span>Get Started as Learner</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition"
            >
              Portal Login
            </Link>
          </div>
        </div>

        {/* Core Showcase Grid: Role Portals & National Competency Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Role Portals Overview */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Public Sector Role Gateways
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  3 Portals
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Tailored digital workspaces with strict role-based access for civil services:
              </p>

              <div className="space-y-3">
                {/* Learner Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        Civil Service Learner Portal
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      Learner
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    AI diagnostic evaluations, competency radar, recommended iGOT courses, and verifiable official transcripts.
                  </p>
                </div>

                {/* Trainer Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700/60 transition group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        Faculty & Trainer Studio
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-1.5 py-0.5 rounded">
                      3 Screens
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Upload course documents, synthesize MCQs via Groq Llama 3.3, and approve/feed directly to learners.
                  </p>
                </div>

                {/* Admin Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        Administration & Telemetry
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cadre readiness analytics, competency mapping matrices, and immutable audit logs.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quick mock accounts enabled on login</span>
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1">
                <span>Access Portals</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Right Column: Telemetry Visualizer Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      National Competency Readiness Index
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live capability scores across core public administration cadres
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Avg 75.6% Proficiency</span>
                </span>
              </div>

              <div className="h-56 w-full pt-2">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
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
                        color: '#f8fafc',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>FRAC Competency Framework Aligned</span>
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">DoPT Benchmark Metric</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">iGOT Karmayogi Courses</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Curated curricula for Data Analysts (MoSPI), Business Analysts (NeGD/MeitY), and Finance Assistants (Dept of Expenditure).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">AI Quiz Synthesis</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ground truth question bank generation powered by Groq Llama 3.3 from official training circulars, GFR 2017, and policy documents.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Competency Radar & Transcripts</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Identify skill deficits against cadre target levels and generate verifiable official civil service training transcripts.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>SkillBridge AI • National Civil Service Competency & Capacity Building Platform • Mission Karmayogi Aligned</p>
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
                  <React.Suspense fallback={<PortalLoadingFallback portalName="Learner Portal" />}>
                    <LearnerPortal />
                  </React.Suspense>
                </RoleRouteGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trainer/*"
            element={
              <ProtectedRoute>
                <RoleRouteGuard allowedRoles={['trainer', 'admin']}>
                  <React.Suspense fallback={<PortalLoadingFallback portalName="Trainer Portal" />}>
                    <TrainerPortal />
                  </React.Suspense>
                </RoleRouteGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <RoleRouteGuard allowedRoles={['admin']}>
                  <React.Suspense fallback={<PortalLoadingFallback portalName="Admin Portal" />}>
                    <AdminPortal />
                  </React.Suspense>
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

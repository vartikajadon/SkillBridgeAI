import React, { useEffect, useState } from 'react';
import { SkillGapAnalysisResponse } from '../../types/assessment';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  BookOpen,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import { useChartTheme } from '../../hooks/useChartTheme';

interface Props {
  sessionToken: string;
  onStartAssessment?: () => void;
}

export const CompetencyGapView: React.FC<Props> = ({ sessionToken, onStartAssessment }) => {
  const chartTheme = useChartTheme();
  const [gapData, setGapData] = useState<SkillGapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGapAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/assessment/gap-analysis', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load skill-gap analysis (${res.status})`);
      }
      const data: SkillGapAnalysisResponse = await res.json();
      setGapData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching gap analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
  }, [sessionToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Computing competency targets and gap analysis matrix...</p>
      </div>
    );
  }

  if (error || !gapData) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-200 space-y-3 max-w-xl mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <h3 className="text-base font-bold">Failed to Compute Skill-Gap Matrix</h3>
        <p className="text-xs text-rose-300">{error || 'Unknown error occurred'}</p>
        <button
          onClick={fetchGapAnalysis}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Check if learner has no assessed competencies
  const hasAssessedCompetencies = gapData.competencies.some(
    (c) => c.current_level !== null && c.current_level > 0
  );

  // Transform data for Recharts Radar
  const radarChartData = gapData.competencies.map((comp) => ({
    subject: comp.competency_name.length > 18 ? `${comp.competency_code}` : comp.competency_name,
    fullName: comp.competency_name,
    code: comp.competency_code,
    currentLevel: comp.current_level ?? 0,
    targetLevel: comp.target_level,
    gap: comp.gap_score ?? 0,
    criticality: comp.criticality,
  }));

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-slate-50 dark:from-indigo-950/70 dark:via-slate-900 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Competency Gap Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {gapData.job_role_title || 'Assigned Job Role'} Benchmark
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Department: {gapData.department || 'Central Government'} • Role Code:{' '}
              {gapData.job_role_code || 'N/A'}
            </p>
          </div>

          {onStartAssessment && (
            <button
              onClick={onStartAssessment}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Take Diagnostic Assessment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Tracked Competencies</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{gapData.total_competencies_tracked}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Public-sector standard</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">Demonstrated Strengths</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{gapData.strengths_count}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Current ≥ Target</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
          <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">Development Priorities</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{gapData.priorities_count}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Current &lt; Target</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-1 shadow-sm">
          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 block font-medium">Average Skill Gap</span>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-300">
            {gapData.average_gap_score > 0 ? `-${gapData.average_gap_score.toFixed(1)}` : '0.0'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Levels below benchmark</span>
        </div>
      </div>

      {/* Mathematical Benchmark Formula Explanation */}
      <div className="bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
        <HelpCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-900 dark:text-white block">
            Zero-Drift Competency Scoring Formula
          </span>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Proficiency gap is strictly computed as{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] border border-slate-200 dark:border-slate-800">
              gap = max(0, target_level - current_level)
            </code>
            . Competencies meeting or exceeding role benchmark (Current ≥ Target) produce zero gap and qualify as Strengths.
            Untested competencies remain unassessed until a validated diagnostic assessment is submitted.
          </p>
        </div>
      </div>

      {/* Main Analysis: Radar Chart + Development Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart (Recharts) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Competency Radar: Current vs Target</span>
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Scale: Level 1–5</span>
          </div>

          {hasAssessedCompetencies ? (
            <div className="w-full h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                  <PolarGrid stroke={chartTheme.radarGrid} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: chartTheme.axisStroke, fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 5]}
                    tickCount={6}
                    stroke={chartTheme.radarRadius}
                    tick={{ fill: chartTheme.axisStroke, fontSize: 10 }}
                  />
                  <Radar
                    name="Target Benchmark"
                    dataKey="targetLevel"
                    stroke="#818cf8"
                    strokeDasharray="4 4"
                    fill="#6366f1"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name="Current Demonstrated Level"
                    dataKey="currentLevel"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: chartTheme.tooltipText,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Target className="w-10 h-10 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-300">Baseline Assessment Required</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Take a diagnostic assessment to generate your personalized competency radar and gap visualization.
              </p>
              {onStartAssessment && (
                <button
                  onClick={onStartAssessment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Start Assessment
                </button>
              )}
            </div>
          )}
        </div>

        {/* Strengths & Development Priorities Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Strengths */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Demonstrated Strengths</h3>
            </div>

            {gapData.strengths.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                No competencies have reached or exceeded target levels yet.
              </p>
            ) : (
              <div className="space-y-2">
                {gapData.strengths.map((item) => (
                  <div
                    key={item.competency_id}
                    className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">{item.competency_name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.competency_code}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                        Level {item.current_level}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Target L{item.target_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Development Priorities (Sorted: Mandatory first, then largest gap) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <Target className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Target Development Priorities</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ordered by statutory criticality (Mandatory before Desirable) and gap magnitude.
            </p>

            {gapData.priorities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                No active development gaps detected. All tracked competencies satisfy role standards.
              </p>
            ) : (
              <div className="space-y-2.5">
                {gapData.priorities.map((item) => {
                  const isMandatory = item.criticality === 'Mandatory';
                  return (
                    <div
                      key={item.competency_id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">{item.competency_name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                                isMandatory
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {item.criticality}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {item.competency_code}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          {item.last_assessed_at === null || item.current_level === null || item.current_level === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-semibold text-[10px]">
                              Unassessed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 font-bold text-[11px]">
                              Deficit: -{item.gap_score}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress representation */}
                      <div className="flex items-center space-x-2 pt-1">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full"
                            style={{
                              width: `${((item.current_level ?? 0) / item.target_level) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                          L{item.current_level ?? 0} / L{item.target_level}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

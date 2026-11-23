import React, { useEffect, useState } from 'react';
import {
  AdminExecutiveMetrics,
  DepartmentCompetencyMetric,
  MonthlyTrendPoint,
} from '../../types/analytics';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  GraduationCap,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useChartTheme } from '../../hooks/useChartTheme';

interface AdminOverviewChartsProps {
  sessionToken: string;
}

export const AdminOverviewCharts: React.FC<AdminOverviewChartsProps> = ({ sessionToken }) => {
  const chartTheme = useChartTheme();
  const [metrics, setMetrics] = useState<AdminExecutiveMetrics | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendPoint[]>([]);
  const [departments, setDepartments] = useState<DepartmentCompetencyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${sessionToken}` };

        const [resMetrics, resTrends, resDepts] = await Promise.all([
          fetch('/api/v1/dashboard/admin/analytics', { headers }),
          fetch('/api/v1/dashboard/admin/trends/time-series?months=6', { headers }),
          fetch('/api/v1/dashboard/admin/trends/departments', { headers }),
        ]);

        if (!resMetrics.ok || !resTrends.ok || !resDepts.ok) {
          throw new Error('Failed to retrieve administrative analytics telemetry');
        }

        const dataMetrics: AdminExecutiveMetrics = await resMetrics.json();
        const dataTrends: MonthlyTrendPoint[] = await resTrends.json();
        const dataDepts: DepartmentCompetencyMetric[] = await resDepts.json();

        setMetrics(dataMetrics);
        setTrends(dataTrends);
        setDepartments(dataDepts);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Telemetry error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionToken]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs">Aggregating national governance and capacity building indicators...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
        {error || 'Unable to load executive metrics'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Learners</span>
            <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.total_learners}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.active_learner_accounts} active accounts
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Course Completion Rate</span>
            <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.course_completion_rate}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">of commenced enrollments</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Assessment Avg Score</span>
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.average_assessment_score}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">completed attempts only</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Quiz Pass Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.quiz_pass_rate}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">benchmarked attempts</div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Courses</span>
            <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.total_courses}</div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
            {metrics.published_courses} published
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Document Pub Ratio</span>
            <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.document_publication_ratio}%</div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
            {metrics.published_documents} of {metrics.total_documents} docs
          </div>
        </div>

        {/* Metric 7 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Assessment Attempts</span>
            <FileCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.completed_quiz_attempts}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {metrics.total_quiz_attempts} total submissions
          </div>
        </div>

        {/* Metric 8 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Training Staff</span>
            <Activity className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.total_trainers + metrics.total_admins}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {metrics.total_trainers} trainers • {metrics.total_admins} admins
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend AreaChart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Learner Engagement Telemetry (6 Months)</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">MAL vs Registrations</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis dataKey="month" stroke={chartTheme.axisStroke} fontSize={11} />
                <YAxis stroke={chartTheme.axisStroke} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    fontSize: '11px',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="monthly_active_learners"
                  name="Monthly Active Learners"
                  stroke="#6366F1"
                  fillOpacity={1}
                  fill="url(#colorMal)"
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="New Registrations"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorReg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity BarChart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Learning Events & Assessments</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Attempts vs Completions</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                <XAxis dataKey="month" stroke={chartTheme.axisStroke} fontSize={11} />
                <YAxis stroke={chartTheme.axisStroke} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    color: chartTheme.tooltipText,
                    fontSize: '11px',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="quiz_attempts" name="Completed Assessments" fill="#818CF8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="course_completions" name="Course Completions" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Departmental Competency Proficiency & Skill Deficit Index</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {departments.length} Ministries Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Ministry / Department</th>
                <th className="py-2.5 px-3">Headcount</th>
                <th className="py-2.5 px-3">Assessment Coverage</th>
                <th className="py-2.5 px-3">Avg Gap Score (Assessed)</th>
                <th className="py-2.5 px-3">Avg Quiz Score</th>
                <th className="py-2.5 px-3">Primary Deficit Focus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {departments.map((dept, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-200">{dept.department}</td>
                  <td className="py-2.5 px-3 font-mono">{dept.total_learners}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[11px]">
                      {dept.assessment_coverage_pct}% ({dept.assessed_learners}/{dept.total_learners})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                      dept.average_gap_score > 1.5
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {dept.average_gap_score.toFixed(2)} pts
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{dept.average_assessment_score}%</td>
                  <td className="py-2.5 px-3">
                    {dept.top_deficit_competency ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[11px]">
                        {dept.top_deficit_competency}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">None (Proficient)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

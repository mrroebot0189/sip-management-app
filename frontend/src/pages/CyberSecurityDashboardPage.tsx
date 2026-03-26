import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Building2,
  TrendingDown,
  CheckCircle2,
  Clock,
  TrendingUp,
  Pause,
  GitBranch,
  BarChart2,
  Activity,
  Filter,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import { dashboardApi } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeptStats {
  overdue: number;
  delayed: number;
  notStarted: number;
  onTrack: number;
  completed: number;
  inPipeline: number;
  nonImplementing: number;
  total: number;
}

interface DepartmentEntry {
  id: string;
  name: string;
  stats: DeptStats;
  health: 'critical' | 'warning' | 'good' | 'empty';
}

interface OverviewData {
  summary: {
    totalDepartments: number;
    totalProjects: number;
    overdueProjects: number;
    delayedProjects: number;
    activeProjects: number;
    completedProjects: number;
    pipelineProjects: number;
  };
  departments: DepartmentEntry[];
  priorityBreakdown: { p1: number; p2: number; p3: number; p4: number };
}

interface MonthlyGrowthEntry {
  month: string;
  newProjects: number;
  cumulativeTotal: number;
  base: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
  warning: {
    label: 'At Risk',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  good: {
    label: 'On Track',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  empty: {
    label: 'No Projects',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-500',
    dot: 'bg-gray-300',
    text: 'text-gray-400',
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#dc2626',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#22c55e',
};

// ── Custom Tooltips ───────────────────────────────────────────────────────────

const StackedBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1.5 truncate">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="font-medium text-gray-700">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between font-semibold text-gray-700">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500">{payload[0].value} project{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
};

const WaterfallTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const entry: MonthlyGrowthEntry = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">New projects</span>
        <span className="font-medium text-emerald-600">+{entry.newProjects}</span>
      </div>
      <div className="flex justify-between gap-4 mt-0.5 border-t border-gray-100 pt-1 mt-1">
        <span className="text-gray-500">Portfolio total</span>
        <span className="font-semibold text-gray-700">{entry.cumulativeTotal}</span>
      </div>
    </div>
  );
};

// ── Summary Card ──────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | null;
  bg: string;
  text: string;
  iconBg: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, bg, text, iconBg, onClick }) => {
  const base = `${bg} rounded-xl p-5 flex items-center gap-4`;
  const clickable = onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md' : '';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`${base} ${clickable}`} onClick={onClick}>
      <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${text}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">
          {value === null ? <span className="opacity-30 animate-pulse">—</span> : value}
        </p>
        <p className={`text-xs font-medium ${text} mt-0.5`}>{label}</p>
      </div>
    </Tag>
  );
};

// ── Department Card ───────────────────────────────────────────────────────────

const DepartmentCard: React.FC<{ dept: DepartmentEntry }> = ({ dept }) => {
  const cfg = HEALTH_CONFIG[dept.health];
  const { stats } = dept;

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <p className="text-sm font-semibold text-gray-800 truncate">{dept.name}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Stats grid */}
      {stats.total > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {stats.overdue > 0 && (
            <div className="bg-red-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-red-700 text-base leading-none">{stats.overdue}</p>
              <p className="text-red-500 mt-0.5">Overdue</p>
            </div>
          )}
          {stats.delayed > 0 && (
            <div className="bg-amber-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-amber-700 text-base leading-none">{stats.delayed}</p>
              <p className="text-amber-500 mt-0.5">Delayed</p>
            </div>
          )}
          {stats.onTrack > 0 && (
            <div className="bg-emerald-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-emerald-700 text-base leading-none">{stats.onTrack}</p>
              <p className="text-emerald-500 mt-0.5">On Track</p>
            </div>
          )}
          {stats.notStarted > 0 && (
            <div className="bg-gray-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-gray-600 text-base leading-none">{stats.notStarted}</p>
              <p className="text-gray-400 mt-0.5">Not Started</p>
            </div>
          )}
          {stats.completed > 0 && (
            <div className="bg-blue-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-blue-700 text-base leading-none">{stats.completed}</p>
              <p className="text-blue-500 mt-0.5">Completed</p>
            </div>
          )}
          {stats.inPipeline > 0 && (
            <div className="bg-violet-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-violet-700 text-base leading-none">{stats.inPipeline}</p>
              <p className="text-violet-500 mt-0.5">Pipeline</p>
            </div>
          )}
          {stats.nonImplementing > 0 && (
            <div className="bg-gray-100 rounded-lg px-2 py-1.5 text-center">
              <p className="font-bold text-gray-500 text-base leading-none">{stats.nonImplementing}</p>
              <p className="text-gray-400 mt-0.5">Non-Impl.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No projects recorded</p>
      )}

      {/* Total */}
      <div className="flex justify-end">
        <span className="text-xs text-gray-400">{stats.total} project{stats.total !== 1 ? 's' : ''} total</span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const CyberSecurityDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'health'>('health');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [growthData, setGrowthData] = useState<MonthlyGrowthEntry[]>([]);
  const [growthLoading, setGrowthLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setGrowthLoading(true);
    setError('');
    dashboardApi
      .getDepartmentOverview()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load security dashboard data.'))
      .finally(() => setLoading(false));
    dashboardApi
      .getMonthlyProjectGrowth()
      .then((res) => setGrowthData(res.data.data))
      .catch(() => {/* non-critical */})
      .finally(() => setGrowthLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Sort departments
  const sortedDepts = data
    ? [...data.departments].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'total') return b.stats.total - a.stats.total;
        // health: critical → warning → good → empty
        const order = { critical: 0, warning: 1, good: 2, empty: 3 };
        return order[a.health] - order[b.health];
      })
    : [];

  // Apply department filter
  const filteredDepts = selectedDepartmentId
    ? sortedDepts.filter((d) => d.id === selectedDepartmentId)
    : sortedDepts;

  // Filtered summary derived from visible departments
  const filteredSummary = filteredDepts.reduce(
    (acc, d) => ({
      totalDepartments: acc.totalDepartments + 1,
      totalProjects: acc.totalProjects + d.stats.total,
      overdueProjects: acc.overdueProjects + d.stats.overdue,
      delayedProjects: acc.delayedProjects + d.stats.delayed,
      activeProjects: acc.activeProjects + d.stats.onTrack + d.stats.notStarted + d.stats.overdue + d.stats.delayed,
      completedProjects: acc.completedProjects + d.stats.completed,
      pipelineProjects: acc.pipelineProjects + d.stats.inPipeline,
    }),
    { totalDepartments: 0, totalProjects: 0, overdueProjects: 0, delayedProjects: 0, activeProjects: 0, completedProjects: 0, pipelineProjects: 0 }
  );

  // Chart data: stacked bar per department (exclude empty)
  const barChartData = filteredDepts
    .filter((d) => d.stats.total > 0)
    .map((d) => ({
      name: d.name,
      fullName: d.name,
      Overdue: d.stats.overdue,
      Delayed: d.stats.delayed,
      'Not Started': d.stats.notStarted,
      'On Track': d.stats.onTrack,
      Completed: d.stats.completed,
      Pipeline: d.stats.inPipeline,
    }));

  const stackedBars = [
    { key: 'Overdue', color: '#dc2626' },
    { key: 'Delayed', color: '#f97316' },
    { key: 'Not Started', color: '#9ca3af' },
    { key: 'On Track', color: '#10b981' },
    { key: 'Completed', color: '#3b82f6' },
    { key: 'Pipeline', color: '#7c3aed' },
  ];

  // Priority pie data
  const priorityData = data
    ? [
        { name: 'P1 – Critical', value: data.priorityBreakdown.p1, fill: PRIORITY_COLORS.P1 },
        { name: 'P2 – High', value: data.priorityBreakdown.p2, fill: PRIORITY_COLORS.P2 },
        { name: 'P3 – Medium', value: data.priorityBreakdown.p3, fill: PRIORITY_COLORS.P3 },
        { name: 'P4 – Low', value: data.priorityBreakdown.p4, fill: PRIORITY_COLORS.P4 },
      ].filter((d) => d.value > 0)
    : [];

  const summary = data ? filteredSummary : null;

  return (
    <AppLayout title="Security Dashboard">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cyber Security Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Security Improvement Programme — all departments overview
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Department Filter ────────────────────────────────────────────── */}
        {!loading && data && data.departments.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filter by Department:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments ({data.departments.length})</option>
                {[...data.departments]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.stats.total} project{dept.stats.total !== 1 ? 's' : ''})
                    </option>
                  ))}
              </select>
              {selectedDepartmentId && (
                <button
                  onClick={() => setSelectedDepartmentId('')}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            {selectedDepartmentId && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                Showing: {data.departments.find((d) => d.id === selectedDepartmentId)?.name}
              </span>
            )}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Summary Cards ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Portfolio Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard
              icon={Building2}
              label="Departments"
              value={loading ? null : (summary?.totalDepartments ?? 0)}
              bg="bg-blue-50"
              text="text-blue-700"
              iconBg="bg-blue-100"
            />
            <SummaryCard
              icon={LayoutDashboard}
              label="Total Projects"
              value={loading ? null : (summary?.totalProjects ?? 0)}
              bg="bg-gray-50"
              text="text-gray-600"
              iconBg="bg-gray-200"
              onClick={() => navigate('/cyber/security-dashboard/all-projects')}
            />
            <SummaryCard
              icon={Clock}
              label="Overdue"
              value={loading ? null : (summary?.overdueProjects ?? 0)}
              bg={summary?.overdueProjects ? 'bg-red-50' : 'bg-gray-50'}
              text={summary?.overdueProjects ? 'text-red-700' : 'text-gray-500'}
              iconBg={summary?.overdueProjects ? 'bg-red-100' : 'bg-gray-200'}
              onClick={() => navigate('/cyber/security-dashboard/projects/overdue')}
            />
            <SummaryCard
              icon={TrendingDown}
              label="Delayed"
              value={loading ? null : (summary?.delayedProjects ?? 0)}
              bg={summary?.delayedProjects ? 'bg-amber-50' : 'bg-gray-50'}
              text={summary?.delayedProjects ? 'text-amber-700' : 'text-gray-500'}
              iconBg={summary?.delayedProjects ? 'bg-amber-100' : 'bg-gray-200'}
              onClick={() => navigate('/cyber/security-dashboard/projects/delayed')}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Active"
              value={loading ? null : (summary?.activeProjects ?? 0)}
              bg="bg-emerald-50"
              text="text-emerald-700"
              iconBg="bg-emerald-100"
              onClick={() => navigate('/cyber/security-dashboard/projects/onTrack')}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Completed"
              value={loading ? null : (summary?.completedProjects ?? 0)}
              bg="bg-blue-50"
              text="text-blue-700"
              iconBg="bg-blue-100"
              onClick={() => navigate('/cyber/security-dashboard/projects/completed')}
            />
          </div>
        </section>

        {/* ── Stacked Bar Chart ────────────────────────────────────────────── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Project Distribution by Department
                </h2>
              </div>
              {!loading && barChartData.length > 0 && (
                <p className="text-xs text-gray-400">{barChartData.length} departments</p>
              )}
            </div>
            {loading ? (
              <div className="h-72 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : barChartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
                No projects to display yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, barChartData.length * 44)}>
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<StackedBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '12px', color: '#6b7280' }}
                  />
                  {stackedBars.map((bar) => (
                    <Bar
                      key={bar.key}
                      dataKey={bar.key}
                      stackId="a"
                      fill={bar.color}
                      radius={bar.key === 'Pipeline' ? [0, 3, 3, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Waterfall Chart: Monthly Project Growth ──────────────────────── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Monthly Project Growth
                </h2>
              </div>
              {!growthLoading && growthData.length > 0 && (
                <p className="text-xs text-gray-400">Last 12 months</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-6">
              Cumulative portfolio size — bars show new projects added each month
            </p>
            {growthLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : growthData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No project history available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={growthData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <ReferenceLine y={0} stroke="#e5e7eb" />
                  {/* Invisible base bar — lifts the visible bar to the right position */}
                  <Bar dataKey="base" stackId="wf" fill="transparent" legendType="none" />
                  {/* Visible bar — the new projects added this month */}
                  <Bar dataKey="newProjects" stackId="wf" name="New projects" radius={[3, 3, 0, 0]}>
                    {growthData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.newProjects > 0 ? '#10b981' : '#e5e7eb'}
                        opacity={entry.newProjects === 0 ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Month-over-month summary strip */}
            {!growthLoading && growthData.length >= 2 && (() => {
              const last = growthData[growthData.length - 1];
              const prev = growthData[growthData.length - 2];
              const diff = last.cumulativeTotal - prev.cumulativeTotal;
              return (
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <span className="font-medium text-gray-700">
                    Portfolio: {last.cumulativeTotal} projects
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>
                    {last.month}:{' '}
                    <span className={diff > 0 ? 'text-emerald-600 font-medium' : diff < 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>
                      {diff > 0 ? `+${diff}` : diff === 0 ? 'no change' : diff} new project{Math.abs(diff) !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>Prev month: {prev.newProjects} new</span>
                </div>
              );
            })()}
          </div>
        </section>

        {/* ── Priority Breakdown + Health Summary ─────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority pie */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                In-Flight Projects — Priority
              </h2>
              {selectedDepartmentId && (
                <span className="text-xs text-gray-400 italic">All departments</span>
              )}
            </div>
            {loading ? (
              <div className="h-44 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : priorityData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
                No in-flight projects.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={9}
                    formatter={(v) => <span style={{ fontSize: '11px', color: '#4b5563' }}>{v}</span>}
                  />
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Health summary */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Department Health Summary
            </h2>
            {loading ? (
              <div className="h-44 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading…
              </div>
            ) : !data ? null : (
              <div className="space-y-3">
                {(['critical', 'warning', 'good', 'empty'] as const).map((h) => {
                  const count = filteredDepts.filter((d) => d.health === h).length;
                  const cfg = HEALTH_CONFIG[h];
                  return (
                    <div key={h} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className={`text-sm font-medium w-24 flex-shrink-0 ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cfg.dot}`}
                          style={{
                            width: filteredDepts.length
                              ? `${(count / filteredDepts.length) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-6 text-right flex-shrink-0">{count}</span>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">
                  Health is determined by whether a department has overdue (critical), delayed (at risk), or only on-track/pipeline projects (good).
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Department Grid ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {selectedDepartmentId ? 'Department Detail' : 'All Departments'}
              </h2>
              {!loading && data && (
                <span className="text-xs text-gray-400">
                  ({filteredDepts.length} of {data.departments.length} departments)
                </span>
              )}
            </div>
            {/* Sort controls */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 mr-1">Sort:</span>
              {(['health', 'total', 'name'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    sortBy === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s === 'health' ? 'Health' : s === 'total' ? 'Size' : 'A–Z'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl h-32 animate-pulse" />
              ))}
            </div>
          ) : filteredDepts.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No departments found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDepts.map((dept) => (
                <DepartmentCard key={dept.id} dept={dept} />
              ))}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  );
};

export default CyberSecurityDashboardPage;

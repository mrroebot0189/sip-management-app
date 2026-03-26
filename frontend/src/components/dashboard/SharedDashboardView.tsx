import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  Clock,
  TrendingDown,
  Pause,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Search,
  ClipboardList,
  UserCheck,
  Lock,
  FileCheck,
  BadgeCheck,
  Wallet,
  Award,
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
} from 'recharts';
import AppLayout from '../layout/AppLayout';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string;
  title: string;
  department: string;
  priority: string;
  status: string;
  timelineStart?: string | null;
  timelineEnd?: string | null;
  latestTracking?: string | null;
  planStatus?: string | null;
}

export interface StageStats {
  count: number;
  projects: ProjectSummary[];
}

export interface DashboardStats {
  agreedStats: {
    overdue: StageStats;
    delayed: StageStats;
    notStarted: StageStats;
    onTrack: StageStats;
    completed: StageStats;
  };
  pipelineStats: {
    waitingDirectorApproval: StageStats;
    waitingFeasibility: StageStats;
    waitingDirectorFeasibility: StageStats;
    waitingCyberFeasibility: StageStats;
    waitingPlanning: StageStats;
    waitingDirectorPlanApproval: StageStats;
    waitingCyberPlanApproval: StageStats;
    waitingBudgetApproval: StageStats;
    approvedProjects: StageStats;
  };
}

interface SharedDashboardViewProps {
  title: string;
  subtitle: string;
  stats: DashboardStats | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  /** Base path used when navigating to the project list drilldown, e.g. '/dashboard' or '/director/dashboard' */
  basePath?: string;
}

// ── Agreed project card colours (dark red → dark green) ───────────────────────

const AGREED_CARDS = [
  {
    key: 'overdue' as const,
    label: 'Overdue',
    description: 'Past deadline, not complete',
    icon: Clock,
    bg: 'bg-red-900',
    text: 'text-white',
    border: 'border-red-950',
    hover: 'hover:bg-red-800',
    badge: 'bg-red-800 text-red-100',
    pieColour: '#7f1d1d',
  },
  {
    key: 'delayed' as const,
    label: 'Delayed',
    description: 'Behind schedule or blocked',
    icon: TrendingDown,
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-700',
    hover: 'hover:bg-red-500',
    badge: 'bg-red-500 text-red-100',
    pieColour: '#dc2626',
  },
  {
    key: 'notStarted' as const,
    label: 'Not Started',
    description: 'Approved but not yet underway',
    icon: Pause,
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-600',
    hover: 'hover:bg-amber-400',
    badge: 'bg-amber-400 text-amber-900',
    pieColour: '#f59e0b',
  },
  {
    key: 'onTrack' as const,
    label: 'On Track',
    description: 'Active and progressing well',
    icon: TrendingUp,
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-600',
    hover: 'hover:bg-emerald-400',
    badge: 'bg-emerald-400 text-emerald-900',
    pieColour: '#10b981',
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    description: 'Finished or closed/verified',
    icon: CheckCircle2,
    bg: 'bg-emerald-800',
    text: 'text-white',
    border: 'border-emerald-900',
    hover: 'hover:bg-emerald-700',
    badge: 'bg-emerald-700 text-emerald-100',
    pieColour: '#065f46',
  },
];

// ── Pipeline stage definitions ────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    key: 'waitingDirectorApproval' as const,
    label: 'Waiting Director Approval',
    shortLabel: 'Dir. Approval',
    description: 'New submissions awaiting initial director sign-off',
    icon: UserCheck,
    colour: '#7c3aed',
    bgLight: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
  },
  {
    key: 'waitingFeasibility' as const,
    label: 'Waiting Feasibility',
    shortLabel: 'Feasibility',
    description: 'Approved – feasibility review not yet submitted',
    icon: Search,
    colour: '#2563eb',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  {
    key: 'waitingDirectorFeasibility' as const,
    label: 'Waiting Director Feasibility Approval',
    shortLabel: 'Dir. Feasibility',
    description: 'Feasibility review submitted – awaiting director decision',
    icon: ClipboardList,
    colour: '#0891b2',
    bgLight: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
  },
  {
    key: 'waitingCyberFeasibility' as const,
    label: 'Waiting Cybersecurity Feasibility Approval',
    shortLabel: 'Cyber Feasibility',
    description: 'Director accepted – cyber team review pending',
    icon: ShieldAlert,
    colour: '#0284c7',
    bgLight: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  {
    key: 'waitingPlanning' as const,
    label: 'Waiting Planning',
    shortLabel: 'Planning',
    description: 'Feasibility complete – project plan being drafted',
    icon: FileCheck,
    colour: '#d97706',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    key: 'waitingDirectorPlanApproval' as const,
    label: 'Waiting Director Planning Approval',
    shortLabel: 'Dir. Plan Approval',
    description: 'Plan submitted – awaiting director approval',
    icon: BadgeCheck,
    colour: '#ea580c',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  {
    key: 'waitingCyberPlanApproval' as const,
    label: 'Waiting Cybersecurity Planning Approval',
    shortLabel: 'Cyber Plan Approval',
    description: 'Director approved plan – cyber review pending',
    icon: Lock,
    colour: '#dc2626',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
  },
  {
    key: 'waitingBudgetApproval' as const,
    label: 'Waiting Budget Approval',
    shortLabel: 'Budget Approval',
    description: 'Plan approved – awaiting budget sign-off',
    icon: Wallet,
    colour: '#16a34a',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
  {
    key: 'approvedProjects' as const,
    label: 'Approved Projects',
    shortLabel: 'Approved',
    description: 'Fully approved and ready to activate',
    icon: Award,
    colour: '#15803d',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
];

// ── Tooltips ──────────────────────────────────────────────────────────────────

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-500">{payload[0].value} project{payload[0].value !== 1 ? 's' : ''}</p>
      <p className="text-blue-500 mt-0.5">Click to view →</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500">{payload[0].value} project{(payload[0].value as number) !== 1 ? 's' : ''}</p>
      <p className="text-blue-500 mt-0.5">Click to view list →</p>
    </div>
  );
};

// ── Shared Dashboard View ──────────────────────────────────────────────────────

const SharedDashboardView: React.FC<SharedDashboardViewProps> = ({
  title,
  subtitle,
  stats,
  loading,
  error,
  onRefresh,
  basePath = '/dashboard',
}) => {
  const navigate = useNavigate();

  const handleAgreedClick = (key: string) => navigate(`${basePath}/projects/${key}`);
  const handlePipelineClick = (key: string) => navigate(`${basePath}/projects/${key}`);

  // ── Chart data ───────────────────────────────────────────────────────────────

  const agreedChartData = AGREED_CARDS.map((c) => ({
    name: c.label,
    value: stats?.agreedStats[c.key]?.count ?? 0,
    fill: c.pieColour,
    stageKey: c.key,
  })).filter((d) => d.value > 0);

  const totalAgreed = AGREED_CARDS.reduce(
    (sum, c) => sum + (stats?.agreedStats[c.key]?.count ?? 0), 0
  );

  const pipelineChartData = PIPELINE_STAGES.map((stage) => ({
    name: stage.shortLabel,
    count: loading ? 0 : (stats?.pipelineStats[stage.key]?.count ?? 0),
    fill: stage.colour,
    stageKey: stage.key,
  }));

  const totalPipeline = pipelineChartData.reduce((s, d) => s + d.count, 0);

  return (
    <AppLayout title={title}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Agreed Projects — Horizontal Cards ───────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Agreed Projects — Delivery Status
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {AGREED_CARDS.map((card) => {
              const Icon = card.icon;
              const count = loading ? null : (stats?.agreedStats[card.key]?.count ?? 0);
              return (
                <button
                  key={card.key}
                  onClick={() => handleAgreedClick(card.key)}
                  style={{ minWidth: '10rem' }}
                  className={`
                    flex-1
                    ${card.bg} ${card.text} ${card.border} ${card.hover}
                    border rounded-xl p-5 text-left transition-all duration-150
                    shadow-sm hover:shadow-md active:scale-95 group
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 ${card.badge} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-3xl font-bold leading-none mb-1">
                    {count === null ? (
                      <span className="opacity-40 animate-pulse">—</span>
                    ) : count}
                  </p>
                  <p className="text-sm font-semibold opacity-90">{card.label}</p>
                  <p className="text-xs opacity-60 mt-0.5 leading-snug">{card.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Agreed Projects — Donut Chart ─────────────────────────────────── */}
        <section>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Agreed Projects — Status Breakdown
              </h2>
              {!loading && totalAgreed > 0 && (
                <span className="text-xs text-gray-400 font-medium">
                  {totalAgreed} project{totalAgreed !== 1 ? 's' : ''} total
                </span>
              )}
            </div>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : totalAgreed === 0 ? (
              <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
                No agreed projects to display yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={agreedChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(data: any) => handleAgreedClick(data.stageKey)}
                    cursor="pointer"
                  >
                    {agreedChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => (
                      <span style={{ fontSize: '12px', color: '#4b5563' }}>{value}</span>
                    )}
                  />
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Pipeline Overview Chart ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Project Pipeline — Approval Stages
            </h2>
            {!loading && (
              <span className="text-xs text-gray-400 font-medium">
                {totalPipeline} project{totalPipeline !== 1 ? 's' : ''} in pipeline
              </span>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-300 text-sm animate-pulse">
                Loading chart…
              </div>
            ) : totalPipeline === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                No projects currently in the pipeline.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart
                  data={pipelineChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 44 }}
                  onClick={(data: any) => {
                    const key = data?.activePayload?.[0]?.payload?.stageKey;
                    if (key) handlePipelineClick(key);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Pipeline Stage Cards ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pipeline Detail — Click to view projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              const count = loading ? null : (stats?.pipelineStats[stage.key]?.count ?? 0);
              return (
                <button
                  key={stage.key}
                  onClick={() => handlePipelineClick(stage.key)}
                  className={`
                    bg-white ${stage.border} border rounded-xl p-5 text-left
                    transition-all duration-150 shadow-sm hover:shadow-md
                    active:scale-95 group cursor-pointer
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-9 h-9 ${stage.bgLight} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${stage.text}`} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                  <div className="mt-3">
                    <p className={`text-4xl font-bold ${stage.text}`}>
                      {count === null ? (
                        <span className="text-gray-200 animate-pulse">—</span>
                      ) : count}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{stage.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{stage.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </AppLayout>
  );
};

export default SharedDashboardView;

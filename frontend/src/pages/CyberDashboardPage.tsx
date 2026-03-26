import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Zap,
  XCircle,
  PauseCircle,
  CalendarClock,
  AlertCircle,
  RefreshCw,
  Building2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import { dashboardApi } from '../services/api';

interface AmendedProject {
  id: string;
  title: string;
  department: string;
  status: string;
  priority: string;
  timelineStart?: string;
  timelineEnd?: string;
}

interface DeptRow {
  name: string;
  feasibility: number;
  planning: number;
  active: number;
  nonImplementing: number;
  released: number;
}

interface PriorityBreakdown {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

interface CyberStats {
  released: number;
  feasibility: number;
  planning: number;
  active: number;
  nonImplementing: number;
  onHold: number;
  startDateAmended: number;
  amendedProjectsList: AmendedProject[];
  departmentBreakdown: DeptRow[];
  priorityBreakdown: PriorityBreakdown;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | null;
  description: string;
  icon: React.ReactNode;
  colour: string;
  bgColour: string;
  borderColour: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  icon,
  colour,
  bgColour,
  borderColour,
}) => (
  <div className={`bg-white border ${borderColour} rounded-xl p-5 shadow-sm flex flex-col gap-3`}>
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <div className={`w-9 h-9 ${bgColour} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
    </div>
    <p className={`text-4xl font-bold ${colour}`}>
      {value === null ? <span className="text-2xl text-gray-300 animate-pulse">—</span> : value}
    </p>
    <p className="text-xs text-gray-400">{description}</p>
  </div>
);

// ── Status badge ───────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  approved: 'Approved',
  under_review: 'Under Review',
  feasibility_assessment: 'Feasibility Assessment',
  feasibility_accepted: 'Feasibility Accepted',
  in_planning: 'In Planning',
  plan_submitted: 'Plan Submitted',
  plan_director_approved: 'Director Approved',
  plan_complete: 'Plan Complete',
  active: 'Active',
  non_implementing: 'Non-Implementing',
  closed_verified: 'Released',
  project_complete: 'Project Complete',
};

const statusColour: Record<string, string> = {
  approved: 'bg-blue-100 text-blue-700',
  under_review: 'bg-blue-100 text-blue-700',
  feasibility_assessment: 'bg-blue-100 text-blue-700',
  feasibility_accepted: 'bg-blue-100 text-blue-700',
  in_planning: 'bg-indigo-100 text-indigo-700',
  plan_submitted: 'bg-indigo-100 text-indigo-700',
  plan_director_approved: 'bg-indigo-100 text-indigo-700',
  plan_complete: 'bg-indigo-100 text-indigo-700',
  active: 'bg-amber-100 text-amber-700',
  non_implementing: 'bg-red-100 text-red-600',
  closed_verified: 'bg-emerald-100 text-emerald-700',
  project_complete: 'bg-emerald-100 text-emerald-700',
};

const priorityColour: Record<string, string> = {
  p1: 'bg-red-100 text-red-700',
  p2: 'bg-orange-100 text-orange-700',
  p3: 'bg-yellow-100 text-yellow-700',
  p4: 'bg-gray-100 text-gray-600',
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColour[status] ?? 'bg-gray-100 text-gray-600'}`}>
    {statusLabel[status] ?? status}
  </span>
);

const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${priorityColour[priority] ?? 'bg-gray-100 text-gray-600'}`}>
    {priority}
  </span>
);

// ── Pie chart colours ──────────────────────────────────────────────────────────
const PIE_COLOURS = ['#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];

// ── Main page ─────────────────────────────────────────────────────────────────
const CyberDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<CyberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAmended, setShowAmended] = useState(true);
  const [showDepts, setShowDepts] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    setError('');
    dashboardApi
      .getCyberStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Failed to load dashboard statistics. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalTracked = stats
    ? stats.feasibility + stats.planning + stats.active + stats.nonImplementing
    : null;

  const pieData = stats
    ? [
        { name: 'Feasibility', value: stats.feasibility },
        { name: 'Planning', value: stats.planning },
        { name: 'Active', value: stats.active },
        { name: 'Non-Implementing', value: stats.nonImplementing },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <AppLayout
      title="Cyber Dashboard"
      actions={
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cyber Security Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Portfolio-wide project status overview across all lifecycle stages
            </p>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Summary banner ── */}
        {!loading && stats && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-6 py-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Projects Released</p>
              <p className="text-3xl font-bold text-cyan-700 mt-0.5">{stats.released}</p>
            </div>
            <div className="h-10 border-l border-cyan-200 hidden sm:block" />
            <div>
              <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Currently in Pipeline</p>
              <p className="text-3xl font-bold text-cyan-700 mt-0.5">{totalTracked}</p>
            </div>
            <div className="h-10 border-l border-cyan-200 hidden sm:block" />
            <div>
              <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Start Dates Amended</p>
              <p className="text-3xl font-bold text-cyan-700 mt-0.5">{stats.startDateAmended}</p>
            </div>
            {stats.priorityBreakdown && (
              <>
                <div className="h-10 border-l border-cyan-200 hidden sm:block" />
                <div className="flex gap-3 flex-wrap">
                  {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => (
                    <div key={p} className="text-center">
                      <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">{p.toUpperCase()}</p>
                      <p className="text-xl font-bold text-cyan-700">{stats.priorityBreakdown[p]}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Stat cards + pie chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Released"
              value={loading ? null : (stats?.released ?? 0)}
              description="Projects closed and verified by Cyber"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              colour="text-emerald-600"
              bgColour="bg-emerald-50"
              borderColour="border-emerald-200"
            />
            <StatCard
              label="In Feasibility"
              value={loading ? null : (stats?.feasibility ?? 0)}
              description="Projects in feasibility review or assessment"
              icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
              colour="text-blue-600"
              bgColour="bg-blue-50"
              borderColour="border-blue-200"
            />
            <StatCard
              label="In Planning"
              value={loading ? null : (stats?.planning ?? 0)}
              description="Projects being planned or awaiting approval"
              icon={<FolderKanban className="w-5 h-5 text-indigo-600" />}
              colour="text-indigo-600"
              bgColour="bg-indigo-50"
              borderColour="border-indigo-200"
            />
            <StatCard
              label="Active"
              value={loading ? null : (stats?.active ?? 0)}
              description="Projects currently in active delivery"
              icon={<Zap className="w-5 h-5 text-amber-600" />}
              colour="text-amber-600"
              bgColour="bg-amber-50"
              borderColour="border-amber-200"
            />
            <StatCard
              label="Non-Implementing"
              value={loading ? null : (stats?.nonImplementing ?? 0)}
              description="Projects marked as non-implementing by Cyber"
              icon={<XCircle className="w-5 h-5 text-red-500" />}
              colour="text-red-500"
              bgColour="bg-red-50"
              borderColour="border-red-200"
            />
            <StatCard
              label="On Hold"
              value={loading ? null : (stats?.onHold ?? 0)}
              description="Active projects currently on hold"
              icon={<PauseCircle className="w-5 h-5 text-orange-500" />}
              colour="text-orange-500"
              bgColour="bg-orange-50"
              borderColour="border-orange-200"
            />
          </div>

          {/* Pie chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
            <p className="text-sm font-semibold text-gray-600 mb-1">Pipeline Distribution</p>
            <p className="text-xs text-gray-400 mb-4">Active pipeline phases (excl. released)</p>
            {loading || !stats || pieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
                {loading ? 'Loading…' : 'No pipeline data'}
              </div>
            ) : (
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius="45%"
                      outerRadius="70%"
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Start date amended highlight ── */}
        <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">Start Date Amendments</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Projects whose planned start date has been amended via a status update
            </p>
          </div>
          <p className="text-4xl font-bold text-purple-600 ml-auto pr-2">
            {loading ? (
              <span className="text-2xl text-gray-300 animate-pulse">—</span>
            ) : (
              stats?.startDateAmended ?? 0
            )}
          </p>
        </div>

        {/* ── Amended projects detail ── */}
        {!loading && stats && (stats.amendedProjectsList?.length ?? 0) > 0 && (
          <div className="bg-white border border-purple-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAmended((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-gray-800 text-sm">
                  Projects with Amended Start Dates
                </span>
                <span className="ml-1 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.amendedProjectsList.length}
                </span>
              </div>
              {showAmended ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showAmended && (
              <div className="overflow-x-auto border-t border-purple-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-purple-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Project</th>
                      <th className="px-5 py-3 text-left">Department</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Priority</th>
                      <th className="px-5 py-3 text-left">Current Start</th>
                      <th className="px-5 py-3 text-left">Current End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.amendedProjectsList.map((proj) => (
                      <tr key={proj.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800 max-w-xs">
                          <span className="line-clamp-2">{proj.title}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{proj.department}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <StatusPill status={proj.status} />
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <PriorityPill priority={proj.priority} />
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {proj.timelineStart
                            ? new Date(proj.timelineStart).toLocaleDateString('en-GB')
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {proj.timelineEnd
                            ? new Date(proj.timelineEnd).toLocaleDateString('en-GB')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Department breakdown ── */}
        {!loading && stats && (stats.departmentBreakdown?.length ?? 0) > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowDepts((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-800 text-sm">Department Breakdown</span>
              </div>
              {showDepts ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showDepts && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Department</th>
                      <th className="px-5 py-3 text-center text-blue-600">Feasibility</th>
                      <th className="px-5 py-3 text-center text-indigo-600">Planning</th>
                      <th className="px-5 py-3 text-center text-amber-600">Active</th>
                      <th className="px-5 py-3 text-center text-red-500">Non-Impl.</th>
                      <th className="px-5 py-3 text-center text-emerald-600">Released</th>
                      <th className="px-5 py-3 text-center text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.departmentBreakdown.map((dept) => {
                      const total =
                        dept.feasibility + dept.planning + dept.active + dept.nonImplementing + dept.released;
                      return (
                        <tr key={dept.name} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">{dept.name}</td>
                          <td className="px-5 py-3 text-center text-blue-700 font-semibold">
                            {dept.feasibility || '—'}
                          </td>
                          <td className="px-5 py-3 text-center text-indigo-700 font-semibold">
                            {dept.planning || '—'}
                          </td>
                          <td className="px-5 py-3 text-center text-amber-700 font-semibold">
                            {dept.active || '—'}
                          </td>
                          <td className="px-5 py-3 text-center text-red-600 font-semibold">
                            {dept.nonImplementing || '—'}
                          </td>
                          <td className="px-5 py-3 text-center text-emerald-700 font-semibold">
                            {dept.released || '—'}
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-gray-700">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Priority breakdown ── */}
        {!loading && stats?.priorityBreakdown && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-700">Priority Breakdown (In-Flight Projects)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => {
                const colours: Record<string, { bg: string; text: string; border: string }> = {
                  p1: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                  p2: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                  p3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                  p4: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
                };
                const c = colours[p];
                return (
                  <div key={p} className={`${c.bg} border ${c.border} rounded-lg p-4 text-center`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${c.text} mb-1`}>{p}</p>
                    <p className={`text-3xl font-bold ${c.text}`}>{stats.priorityBreakdown[p]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stage reference legend ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Stage Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">Feasibility</strong> — approved, under review, assessment, feasibility accepted</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">Planning</strong> — in planning, plan submitted, director approved, plan complete</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">Active</strong> — project is in active delivery</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">Non-Implementing</strong> — Cyber has marked project as non-implementing</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">On Hold</strong> — active projects where the latest status update is "on hold"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
              <span><strong className="text-gray-700">Released</strong> — closed and verified by Cyber Security</span>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default CyberDashboardPage;

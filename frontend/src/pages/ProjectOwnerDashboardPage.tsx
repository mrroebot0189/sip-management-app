import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  FolderKanban,
  Zap,
  ClipboardList,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OwnerProject {
  id: string;
  title: string;
  priority: string;
  status: string;
  department: string;
  timelineStart?: string | null;
  timelineEnd?: string | null;
  planStatus?: string | null;
  activeStartDate?: string | null;
  latestTrackingStatus?: string | null;
}

interface OwnerStats {
  planningCount: number;
  activeCount: number;
  assignedCount: number;
  assigned: OwnerProject[];
  planning: OwnerProject[];
  active: OwnerProject[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_COLOURS: Record<string, string> = {
  p1: 'bg-red-100 text-red-700 border-red-200',
  p2: 'bg-orange-100 text-orange-700 border-orange-200',
  p3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  p4: 'bg-green-100 text-green-700 border-green-200',
};

const PRIORITY_LABELS: Record<string, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  new: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  under_review: 'Under Review',
  feasibility_assessment: 'Feasibility Assessment',
  feasibility_accepted: 'Feasibility Accepted',
  feasibility_rejected: 'Feasibility Rejected',
  non_implementing: 'Non-Implementing',
  in_planning: 'In Planning',
  plan_submitted: 'Plan Submitted',
  plan_director_approved: 'Plan Director Approved',
  plan_complete: 'Plan Complete',
  active: 'Active',
  project_complete: 'Project Complete',
  closed_verified: 'Closed & Verified',
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  new: 'bg-blue-100 text-blue-700',
  approved: 'bg-violet-100 text-violet-700',
  rejected: 'bg-red-100 text-red-700',
  under_review: 'bg-cyan-100 text-cyan-700',
  feasibility_assessment: 'bg-cyan-100 text-cyan-700',
  feasibility_accepted: 'bg-sky-100 text-sky-700',
  feasibility_rejected: 'bg-red-100 text-red-700',
  non_implementing: 'bg-gray-100 text-gray-600',
  in_planning: 'bg-amber-100 text-amber-700',
  plan_submitted: 'bg-orange-100 text-orange-700',
  plan_director_approved: 'bg-orange-100 text-orange-700',
  plan_complete: 'bg-lime-100 text-lime-700',
  active: 'bg-emerald-100 text-emerald-700',
  project_complete: 'bg-emerald-100 text-emerald-700',
  closed_verified: 'bg-emerald-200 text-emerald-800',
};

const TRACKING_LABELS: Record<string, { label: string; colour: string }> = {
  started: { label: 'Started', colour: 'text-blue-600' },
  on_track: { label: 'On Track', colour: 'text-emerald-600' },
  not_started: { label: 'Not Started', colour: 'text-amber-600' },
  in_planning: { label: 'In Planning', colour: 'text-amber-600' },
  on_hold: { label: 'On Hold', colour: 'text-orange-600' },
  delayed: { label: 'Delayed', colour: 'text-red-500' },
  blocked: { label: 'Blocked', colour: 'text-red-700' },
  escalation_needed: { label: 'Escalation Needed', colour: 'text-red-700' },
  project_complete: { label: 'Complete', colour: 'text-emerald-700' },
  closed_and_verified: { label: 'Closed', colour: 'text-emerald-700' },
};

const formatDate = (d?: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Project Row ────────────────────────────────────────────────────────────────

const ProjectRow: React.FC<{ project: OwnerProject; onNavigate: (id: string, status: string) => void }> = ({
  project,
  onNavigate,
}) => {
  const tracking = project.latestTrackingStatus
    ? TRACKING_LABELS[project.latestTrackingStatus]
    : null;

  return (
    <button
      onClick={() => onNavigate(project.id, project.status)}
      className="w-full text-left flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 group"
    >
      {/* Priority badge */}
      <span
        className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md border ${PRIORITY_COLOURS[project.priority] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
      >
        {PRIORITY_LABELS[project.priority] ?? project.priority.toUpperCase()}
      </span>

      {/* Title + department */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{project.department}</p>
      </div>

      {/* Timeline */}
      {(project.timelineStart || project.timelineEnd) ? (
        <div className="flex-shrink-0 text-right hidden sm:block">
          <p className="text-xs text-gray-500">{formatDate(project.timelineStart)} → {formatDate(project.timelineEnd)}</p>
        </div>
      ) : null}

      {/* Tracking status for active projects */}
      {tracking && (
        <span className={`flex-shrink-0 text-xs font-medium ${tracking.colour} hidden sm:block`}>
          {tracking.label}
        </span>
      )}

      {/* Status badge */}
      <span
        className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[project.status] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {STATUS_LABELS[project.status] ?? project.status}
      </span>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
    </button>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const ProjectOwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    dashboardApi
      .getProjectOwnerStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Navigate to the most relevant page for a project based on its status
  const handleProjectNav = (id: string, status: string) => {
    if (status === 'active' || status === 'project_complete') {
      navigate(`/active-projects/${id}/tracker`);
    } else if (
      status === 'in_planning' ||
      status === 'plan_submitted' ||
      status === 'plan_director_approved' ||
      status === 'plan_complete'
    ) {
      navigate(`/project-plans/${id}`);
    } else if (
      status === 'approved' ||
      status === 'under_review' ||
      status === 'feasibility_assessment' ||
      status === 'feasibility_accepted'
    ) {
      navigate(`/feasibility-reviews/${id}`);
    } else {
      navigate(`/sip-projects/${id}`);
    }
  };

  const summaryCards = [
    {
      label: 'Total Projects',
      value: stats?.assignedCount ?? 0,
      icon: FolderKanban,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-600',
      text: 'text-blue-700',
    },
    {
      label: 'Active Projects',
      value: stats?.activeCount ?? 0,
      icon: Zap,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-600',
      text: 'text-emerald-700',
    },
    {
      label: 'In Planning',
      value: stats?.planningCount ?? 0,
      icon: ClipboardList,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500',
      text: 'text-amber-700',
    },
  ];

  // Projects in pipeline (not yet active or complete)
  const pipelineProjects = stats?.assigned.filter(
    (p) =>
      p.status !== 'active' &&
      p.status !== 'project_complete' &&
      p.status !== 'closed_verified' &&
      p.status !== 'in_planning' &&
      p.status !== 'plan_submitted' &&
      p.status !== 'plan_director_approved' &&
      p.status !== 'plan_complete'
  ) ?? [];

  return (
    <AppLayout title={`Welcome back, ${user?.firstName}`}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome back, {user?.firstName}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Security Improvement Programme — your projects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`${card.bg} rounded-xl p-5 border border-gray-100`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${card.text}`}>
                  {loading ? <span className="opacity-30 animate-pulse">—</span> : card.value}
                </p>
                <p className="text-sm font-medium text-gray-600 mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* ── Active Projects ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Active Projects
            </h2>
            {(stats?.activeCount ?? 0) > 0 && (
              <button
                onClick={() => navigate('/active-projects')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400 animate-pulse">
                Loading projects…
              </div>
            ) : (stats?.active.length ?? 0) === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No active projects yet.
              </div>
            ) : (
              stats!.active.map((p) => (
                <ProjectRow key={p.id} project={p} onNavigate={handleProjectNav} />
              ))
            )}
          </div>
        </section>

        {/* ── Planning Projects ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              In Planning
            </h2>
            {(stats?.planningCount ?? 0) > 0 && (
              <button
                onClick={() => navigate('/project-plans')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400 animate-pulse">
                Loading projects…
              </div>
            ) : (stats?.planning.length ?? 0) === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No projects currently in planning.
              </div>
            ) : (
              stats!.planning.map((p) => (
                <ProjectRow key={p.id} project={p} onNavigate={handleProjectNav} />
              ))
            )}
          </div>
        </section>

        {/* ── Pipeline / Other Projects ──────────────────────────────────────── */}
        {!loading && pipelineProjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Pipeline — Awaiting Approval
              </h2>
              <button
                onClick={() => navigate('/sip-projects')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {pipelineProjects.map((p) => (
                <ProjectRow key={p.id} project={p} onNavigate={handleProjectNav} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state when no projects at all ───────────────────────────── */}
        {!loading && (stats?.assignedCount ?? 0) === 0 && (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No projects yet</p>
            <p className="text-sm text-gray-400 mb-5">
              Submit a Security Improvement Programme project to get started.
            </p>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default ProjectOwnerDashboardPage;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { dashboardApi } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectSummary {
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

interface StageStats {
  count: number;
  projects: ProjectSummary[];
}

interface UnifiedStats {
  agreedStats: Record<string, StageStats>;
  pipelineStats: Record<string, StageStats>;
}

// ── Filter metadata ────────────────────────────────────────────────────────────

const FILTER_META: Record<string, { label: string; description: string; colour: string }> = {
  // Agreed
  overdue: {
    label: 'Overdue Projects',
    description: 'Active projects that have passed their planned end date.',
    colour: 'text-red-900',
  },
  delayed: {
    label: 'Delayed Projects',
    description: 'Active projects currently flagged as delayed, blocked or requiring escalation.',
    colour: 'text-red-600',
  },
  notStarted: {
    label: 'Not Started Projects',
    description: 'Active projects with no tracking status recorded yet.',
    colour: 'text-amber-600',
  },
  onTrack: {
    label: 'On Track Projects',
    description: 'Active projects progressing within schedule.',
    colour: 'text-emerald-600',
  },
  completed: {
    label: 'Completed Projects',
    description: 'Projects that have been marked as complete or closed and verified.',
    colour: 'text-emerald-800',
  },
  // Pipeline
  waitingDirectorApproval: {
    label: 'Waiting Director Approval',
    description: 'New project submissions awaiting initial director sign-off.',
    colour: 'text-violet-700',
  },
  waitingFeasibility: {
    label: 'Waiting Feasibility',
    description: 'Director-approved projects where the feasibility review has not yet been submitted.',
    colour: 'text-blue-700',
  },
  waitingDirectorFeasibility: {
    label: 'Waiting Director Feasibility Approval',
    description: 'Feasibility review submitted — awaiting director accept or reject.',
    colour: 'text-cyan-700',
  },
  waitingCyberFeasibility: {
    label: 'Waiting Cybersecurity Feasibility Approval',
    description: 'Director accepted feasibility — cyber team review pending.',
    colour: 'text-sky-700',
  },
  waitingPlanning: {
    label: 'Waiting Planning',
    description: 'Feasibility complete — project plan currently being drafted.',
    colour: 'text-amber-700',
  },
  waitingDirectorPlanApproval: {
    label: 'Waiting Director Planning Approval',
    description: 'Plan submitted — awaiting director approval.',
    colour: 'text-orange-700',
  },
  waitingCyberPlanApproval: {
    label: 'Waiting Cybersecurity Planning Approval',
    description: 'Director approved plan — cyber team review pending.',
    colour: 'text-red-700',
  },
  waitingBudgetApproval: {
    label: 'Waiting Budget Approval',
    description: 'Plan fully approved — awaiting budget sign-off.',
    colour: 'text-green-700',
  },
  approvedProjects: {
    label: 'Approved Projects',
    description: 'Fully approved projects ready to be activated.',
    colour: 'text-emerald-700',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  p1: 'bg-red-100 text-red-700 border border-red-200',
  p2: 'bg-orange-100 text-orange-700 border border-orange-200',
  p3: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  p4: 'bg-green-100 text-green-700 border border-green-200',
};
const PRIORITY_LABEL: Record<string, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  approved: 'Approved',
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
  project_complete: 'Complete',
  closed_verified: 'Closed & Verified',
};

const TRACKING_BADGE: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  started: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
  in_planning: 'bg-indigo-100 text-indigo-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  delayed: 'bg-orange-100 text-orange-700',
  blocked: 'bg-red-100 text-red-700',
  escalation_needed: 'bg-red-200 text-red-800',
  project_complete: 'bg-teal-100 text-teal-700',
};
const TRACKING_LABEL: Record<string, string> = {
  on_track: 'On Track',
  started: 'Started',
  not_started: 'Not Started',
  in_planning: 'In Planning',
  on_hold: 'On Hold',
  delayed: 'Delayed',
  blocked: 'Blocked',
  escalation_needed: 'Escalation Needed',
  project_complete: 'Complete',
};

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Determine which URL to navigate to when clicking a project row
function projectUrl(filter: string, projectId: string): string {
  const agreedFilters = ['overdue', 'delayed', 'notStarted', 'onTrack', 'completed'];
  if (agreedFilters.includes(filter)) {
    return `/active-projects/${projectId}/tracker`;
  }
  // Pipeline stages – link to the appropriate workflow page
  switch (filter) {
    case 'waitingDirectorApproval':
      return `/director/projects/${projectId}/approve`;
    case 'waitingFeasibility':
      return `/feasibility-reviews/${projectId}`;
    case 'waitingDirectorFeasibility':
      return `/director/feasibility/${projectId}/review`;
    case 'waitingCyberFeasibility':
      return `/cyber/feasibility-reviews`;
    case 'waitingPlanning':
      return `/project-plans/${projectId}`;
    case 'waitingDirectorPlanApproval':
      return `/director/plan-review/${projectId}`;
    case 'waitingCyberPlanApproval':
      return `/cyber/plan-review`;
    case 'waitingBudgetApproval':
    case 'approvedProjects':
      return `/project-plans/${projectId}`;
    default:
      return `/sip-projects/${projectId}`;
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const DashboardProjectListPage: React.FC = () => {
  const { filter = '' } = useParams<{ filter: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine scope from URL path
  const isDirectorScope = location.pathname.startsWith('/director/dashboard');
  const isProjectManagerScope = location.pathname.startsWith('/project-manager/dashboard');
  const backPath = isDirectorScope
    ? '/director/dashboard'
    : isProjectManagerScope
    ? '/project-manager/dashboard'
    : location.pathname.startsWith('/cyber/security-dashboard')
    ? '/cyber/security-dashboard'
    : location.pathname.startsWith('/cyber/dashboard')
    ? '/cyber/dashboard'
    : '/dashboard';

  const [stats, setStats] = useState<UnifiedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const fetchFn = isDirectorScope
      ? dashboardApi.getDirectorUnifiedStats()
      : isProjectManagerScope
      ? dashboardApi.getProjectManagerStats()
      : dashboardApi.getUnifiedStats();
    fetchFn
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Failed to load project data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const meta = FILTER_META[filter] ?? { label: 'Projects', description: '', colour: 'text-gray-700' };

  const projects: ProjectSummary[] = (() => {
    if (!stats) return [];
    const agreedFilters = ['overdue', 'delayed', 'notStarted', 'onTrack', 'completed'];
    if (agreedFilters.includes(filter)) {
      return stats.agreedStats[filter]?.projects ?? [];
    }
    return stats.pipelineStats[filter]?.projects ?? [];
  })();

  const showTracking = ['overdue', 'delayed', 'notStarted', 'onTrack', 'completed'].includes(filter);
  const showTimeline = ['overdue', 'delayed', 'onTrack', 'waitingPlanning', 'waitingDirectorPlanApproval', 'waitingCyberPlanApproval', 'waitingBudgetApproval', 'approvedProjects'].includes(filter);

  return (
    <AppLayout title={meta.label}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(backPath)}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className={`text-xl font-bold ${meta.colour} leading-tight truncate`}>
                {meta.label}
              </h1>
              {meta.description && (
                <p className="text-sm text-gray-400 mt-0.5">{meta.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Project count badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-300 animate-pulse text-sm">
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No projects in this category.</p>
            <button
              onClick={() => navigate(backPath)}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                  {showTracking && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking</th>
                  )}
                  {showTimeline && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                  )}
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((proj) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(projectUrl(filter, proj.id))}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 line-clamp-2">{proj.title}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{proj.department}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGE[proj.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {PRIORITY_LABEL[proj.priority] || proj.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {STATUS_LABEL[proj.status] || proj.status}
                      </span>
                    </td>
                    {showTracking && (
                      <td className="px-4 py-4">
                        {proj.latestTracking ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TRACKING_BADGE[proj.latestTracking] || 'bg-gray-100 text-gray-600'}`}>
                            {TRACKING_LABEL[proj.latestTracking] || proj.latestTracking}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {showTimeline && (
                      <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(proj.timelineEnd)}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DashboardProjectListPage;

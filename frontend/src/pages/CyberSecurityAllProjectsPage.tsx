import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Filter,
  X,
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

function projectUrl(proj: ProjectSummary): string {
  const activeStatuses = ['active', 'project_complete', 'closed_verified'];
  if (activeStatuses.includes(proj.status)) {
    return `/active-projects/${proj.id}/tracker`;
  }
  return `/sip-projects/${proj.id}`;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const CyberSecurityAllProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.pathname.startsWith('/cyber/security-dashboard')
    ? '/cyber/security-dashboard'
    : '/cyber/dashboard';

  const [stats, setStats] = useState<UnifiedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'department' | 'status' | 'priority'>('department');

  const load = () => {
    setLoading(true);
    setError('');
    dashboardApi
      .getUnifiedStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Failed to load project data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Merge all projects from all stats groups, deduplicated by id
  const allProjects: ProjectSummary[] = useMemo(() => {
    if (!stats) return [];
    const seen = new Set<string>();
    const merged: ProjectSummary[] = [];
    const addProjects = (projects: ProjectSummary[]) => {
      for (const p of projects) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
    };
    Object.values(stats.agreedStats).forEach((s) => addProjects(s.projects));
    Object.values(stats.pipelineStats).forEach((s) => addProjects(s.projects));
    return merged;
  }, [stats]);

  // Unique department names for the filter dropdown
  const departments: string[] = useMemo(() => {
    const set = new Set<string>();
    allProjects.forEach((p) => { if (p.department) set.add(p.department); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allProjects]);

  // Apply department filter + sort
  const filteredProjects = useMemo(() => {
    let projects = selectedDepartment
      ? allProjects.filter((p) => p.department === selectedDepartment)
      : allProjects;

    return [...projects].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'department') return a.department.localeCompare(b.department) || a.title.localeCompare(b.title);
      if (sortBy === 'priority') return (a.priority || '').localeCompare(b.priority || '');
      if (sortBy === 'status') return (STATUS_LABEL[a.status] || a.status).localeCompare(STATUS_LABEL[b.status] || b.status);
      return 0;
    });
  }, [allProjects, selectedDepartment, sortBy]);

  return (
    <AppLayout title="All Projects">
      <div className="max-w-7xl mx-auto space-y-6">

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
              <h1 className="text-xl font-bold text-gray-900 leading-tight">All Projects</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Complete portfolio — all departments, all stages
              </p>
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

        {/* Filters + count bar */}
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Department filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {selectedDepartment && (
                <button
                  onClick={() => setSelectedDepartment('')}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Clear department filter"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-gray-400 mr-1">Sort:</span>
              {(['department', 'title', 'priority', 'status'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors capitalize ${
                    sortBy === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s === 'title' ? 'Name' : s === 'department' ? 'Dept' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Project count */}
            <span className="text-sm text-gray-400 border-l border-gray-200 pl-3">
              {filteredProjects.length}
              {selectedDepartment ? ` / ${allProjects.length}` : ''} project{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Active filter pill */}
        {selectedDepartment && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1">
              {selectedDepartment}
              <button
                onClick={() => setSelectedDepartment('')}
                className="hover:text-blue-900 transition-colors"
                aria-label="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-300 animate-pulse text-sm">
            Loading…
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {selectedDepartment ? `No projects found for "${selectedDepartment}".` : 'No projects found.'}
            </p>
            {selectedDepartment && (
              <button
                onClick={() => setSelectedDepartment('')}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Clear filter
              </button>
            )}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((proj) => (
                  <tr
                    key={proj.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(projectUrl(proj))}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 line-clamp-2">{proj.title}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{proj.department}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGE[proj.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {PRIORITY_LABEL[proj.priority] || proj.priority?.toUpperCase() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {STATUS_LABEL[proj.status] || proj.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {proj.latestTracking ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TRACKING_BADGE[proj.latestTracking] || 'bg-gray-100 text-gray-600'}`}>
                          {TRACKING_LABEL[proj.latestTracking] || proj.latestTracking}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(proj.timelineEnd)}
                    </td>
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

export default CyberSecurityAllProjectsPage;

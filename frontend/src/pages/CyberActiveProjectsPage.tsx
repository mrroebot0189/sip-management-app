import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  Trash2,
  AlertCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { sipProjectsApi } from '../services/api';
import { SipProject, SipPriority, SipProjectStatus } from '../types';

const PRIORITY_COLOURS: Record<SipPriority, string> = {
  p1: 'bg-red-100 text-red-700',
  p2: 'bg-orange-100 text-orange-700',
  p3: 'bg-yellow-100 text-yellow-700',
  p4: 'bg-green-100 text-green-700',
};

const PRIORITY_LABELS: Record<SipPriority, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const STATUS_LABELS: Partial<Record<SipProjectStatus, string>> = {
  new: 'Awaiting Director Review',
  approved: 'Approved',
  rejected: 'Rejected',
  under_review: 'Under Review',
  feasibility_assessment: 'Feasibility Assessment',
  feasibility_accepted: 'In Planning',
  feasibility_rejected: 'Feasibility Rejected',
  non_implementing: 'Non-Implementing',
  in_planning: 'In Planning',
  plan_submitted: 'Plan Submitted',
  plan_director_approved: 'Director Approved',
  plan_complete: 'Plan Complete',
  active: 'Active',
  project_complete: 'Project Complete',
  closed_verified: 'Released',
};

const STATUS_COLOURS: Partial<Record<SipProjectStatus, string>> = {
  new: 'bg-blue-100 text-blue-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  under_review: 'bg-blue-100 text-blue-700',
  feasibility_assessment: 'bg-indigo-100 text-indigo-700',
  feasibility_accepted: 'bg-purple-100 text-purple-700',
  feasibility_rejected: 'bg-red-100 text-red-700',
  non_implementing: 'bg-red-100 text-red-600',
  in_planning: 'bg-purple-100 text-purple-700',
  plan_submitted: 'bg-purple-100 text-purple-700',
  plan_director_approved: 'bg-purple-100 text-purple-700',
  plan_complete: 'bg-purple-100 text-purple-700',
  active: 'bg-amber-100 text-amber-700',
  project_complete: 'bg-emerald-100 text-emerald-700',
  closed_verified: 'bg-emerald-100 text-emerald-700',
};

// Statuses that cannot be withdrawn (project is too far along or already closed)
const NON_WITHDRAWABLE_STATUSES: SipProjectStatus[] = [
  'active',
  'project_complete',
  'closed_verified',
];

const CyberActiveProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<SipProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    setError('');
    sipProjectsApi
      .getMySubmitted()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load your submitted projects. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleWithdraw = async (project: SipProject) => {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw and delete "${project.improvementTitle}"?\n\nThis will permanently remove the project and all associated data. This action cannot be undone.`
    );
    if (!confirmed) return;

    setWithdrawingId(project.id);
    setError('');
    try {
      await sipProjectsApi.withdrawProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to withdraw the project. Please try again.');
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <AppLayout
      title="My Active Projects"
      actions={
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Active Projects</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Projects you have submitted to directors — currently in the pipeline
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Info notice about withdraw */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
          <strong>Note:</strong> You can withdraw and delete projects that are still in the review or
          planning stages. Projects that are already active, complete, or released cannot be withdrawn.
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No submitted projects</p>
            <p className="text-gray-400 text-sm mt-1">
              Projects you submit to directors will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Count banner */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3 text-cyan-800 text-sm">
              You have <strong>{projects.length}</strong> project{projects.length !== 1 ? 's' : ''}{' '}
              currently in the pipeline.
            </div>

            {/* Projects table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Project Title</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((project) => {
                    const canWithdraw = !NON_WITHDRAWABLE_STATUSES.includes(project.status);
                    const isWithdrawing = withdrawingId === project.id;
                    return (
                      <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-900 max-w-xs">
                          <span className="line-clamp-2">{project.improvementTitle}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                          {project.department?.name ?? '—'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[project.priority]}`}
                          >
                            {PRIORITY_LABELS[project.priority]}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[project.status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {STATUS_LABELS[project.status] ?? project.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {project.submittedAt
                            ? new Date(project.submittedAt).toLocaleDateString('en-GB')
                            : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {canWithdraw ? (
                            <button
                              onClick={() => handleWithdraw(project)}
                              disabled={isWithdrawing}
                              title="Withdraw and delete this project"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {isWithdrawing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Withdraw &amp; Delete
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 text-xs font-medium cursor-not-allowed">
                              <XCircle className="w-3.5 h-3.5" />
                              Cannot withdraw
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default CyberActiveProjectsPage;

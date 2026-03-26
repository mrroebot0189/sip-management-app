import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FolderOpen,
  Calendar,
  DollarSign,
  Target,
  Activity,
  ListChecks,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { projectPlansApi } from '../services/api';
import { SipProjectWithPlan } from '../types';

const planStatusLabels: Record<string, string> = {
  ready: 'Ready',
  awaiting_budget_approval: 'Awaiting Budget Approval',
  resource_requested: 'Resource Requested',
  in_planning: 'In Planning',
};

const PlanDetail: React.FC<{ projectData: SipProjectWithPlan; onBack: () => void; onApproved: () => void; onRevisionRequested: () => void }> = ({
  projectData,
  onBack,
  onApproved,
  onRevisionRequested,
}) => {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const plan = projectData.projectPlan;

  const handleApprove = async () => {
    setApproving(true);
    setActionError('');
    try {
      await projectPlansApi.cyberApprove(projectData.id);
      setActionSuccess('Project plan fully approved. The team has been notified.');
      onApproved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to approve plan.';
      setActionError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('Please provide a reason for returning the plan.');
      return;
    }
    setRejecting(true);
    setActionError('');
    try {
      await projectPlansApi.cyberReject(projectData.id, rejectionReason.trim());
      setShowRejectModal(false);
      setActionSuccess('Plan returned to planning manager for revision.');
      onRevisionRequested();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to return plan for revision.';
      setActionError(msg);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Plan Review List
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{projectData.improvementTitle}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {(projectData as { department?: { name: string } }).department?.name ?? '—'} · Cyber Plan Review
        </p>
      </div>

      {actionSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Project objective */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Project Objective</h2>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 w-44 align-top">Improvement Title</td>
              <td className="px-5 py-3 text-gray-900">{projectData.improvementTitle}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 align-top">Problem / Weakness</td>
              <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.projectProblem}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 align-top">Desired Outcomes</td>
              <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.desiredOutcomes}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Plan details */}
      {plan && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">Project Plan</h2>
            {plan.planStatus && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {planStatusLabels[plan.planStatus] ?? plan.planStatus}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100 text-sm">
            {plan.projectOwner && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Target className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-0.5">Project Owner</p>
                  <p className="text-gray-900">{plan.projectOwner}</p>
                </div>
              </div>
            )}
            {plan.budgetAllocated != null && (
              <div className="px-5 py-3 flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-0.5">Budget Allocated</p>
                  <p className="text-gray-900">£{plan.budgetAllocated}</p>
                </div>
              </div>
            )}
            {(plan.timelineStart || plan.timelineEnd) && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-0.5">Project Timeline</p>
                  <p className="text-gray-900">
                    {plan.timelineStart ? new Date(plan.timelineStart).toLocaleDateString() : '?'}
                    {' – '}
                    {plan.timelineEnd ? new Date(plan.timelineEnd).toLocaleDateString() : '?'}
                  </p>
                </div>
              </div>
            )}
            {plan?.keyDeliverables && (
              <div className="px-5 py-3 flex items-start gap-3">
                <ListChecks className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-1">Key Deliverables &amp; Milestones</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{plan.keyDeliverables}</p>
                </div>
              </div>
            )}
            {plan.plannedActivities && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-0.5">High Level Project Plan</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{plan.plannedActivities}</p>
                </div>
              </div>
            )}
            {plan.scope && (
              <div className="px-5 py-3 flex items-start gap-3">
                <Target className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-500 text-xs mb-0.5">In Scope and Out of Scope</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{plan.scope}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {/* Action buttons */}
      {!actionSuccess && plan?.status === 'director_approved' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            {approving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Approve Plan
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={approving || rejecting}
            className="flex items-center gap-2 bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Return for Revision
          </button>
        </div>
      )}

      {/* Return for Revision modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Return Plan for Revision</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please describe what changes are required. The planning manager will be able to edit and resubmit the plan.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Describe what needs to be revised…"
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            {actionError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); setActionError(''); }}
                disabled={rejecting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                {rejecting ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Return for Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CyberPlanReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState<SipProjectWithPlan | null>(null);

  const loadProjects = () => {
    setLoading(true);
    projectPlansApi
      .getForCyberReview()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load plans for review.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Cyber Plan Review">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (selectedProject) {
    return (
      <AppLayout title="Cyber Plan Review">
        <PlanDetail
          projectData={selectedProject}
          onBack={() => setSelectedProject(null)}
          onApproved={() => {
            setSelectedProject(null);
            loadProjects();
          }}
          onRevisionRequested={() => {
            setSelectedProject(null);
            loadProjects();
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Cyber Plan Review">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plan Review – Cyber Security</h1>
            <p className="text-gray-500 text-sm mt-1">
              Project plans approved by the Director, awaiting Cyber Security review
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-700 text-sm font-medium">
            {projects.length} plan{projects.length !== 1 ? 's' : ''} pending
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No plans awaiting cyber review</p>
            <p className="text-gray-400 text-sm mt-1">
              Plans will appear here after they have been approved by a Director.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 truncate">{project.improvementTitle}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        Director Approved
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{(project as { department?: { name: string } }).department?.name ?? '—'}</span>
                      {project.projectPlan?.projectOwner && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>Owner: {project.projectPlan.projectOwner}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CyberPlanReviewPage;

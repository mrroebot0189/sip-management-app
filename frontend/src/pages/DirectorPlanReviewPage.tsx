import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Target,
  Activity,
  ListChecks,
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

const DirectorPlanReviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState<SipProjectWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (!projectId) return;
    projectPlansApi
      .getByProjectId(projectId)
      .then((res) => setProjectData(res.data.data))
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleApprove = async () => {
    setApproving(true);
    setActionError('');
    try {
      await projectPlansApi.directorApprove(projectId!);
      setActionSuccess('Plan approved. Cyber Security has been notified.');
      const res = await projectPlansApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
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
      await projectPlansApi.directorReject(projectId!, rejectionReason.trim());
      setActionSuccess('Plan returned to planning manager for revision.');
      setShowRejectModal(false);
      const res = await projectPlansApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to return plan.';
      setActionError(msg);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Review Project Plan">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !projectData) {
    return (
      <AppLayout title="Review Project Plan">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error || 'Project not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }

  const plan = projectData.projectPlan;
  const isAlreadyDecided =
    plan?.status === 'director_approved' || plan?.status === 'cyber_approved';


  return (
    <AppLayout title="Review Project Plan">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/director/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Director Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{projectData.improvementTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {(projectData as { department?: { name: string } }).department?.name ?? '—'} · Project Plan Review
          </p>
        </div>

        {/* Status banners */}
        {actionSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {actionSuccess}
          </div>
        )}
        {isAlreadyDecided && !actionSuccess && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            This plan has already been approved.
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
        {plan ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">Project Plan Details</h2>
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
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm mb-6">
            No plan document found for this project.
          </div>
        )}

        {/* Error */}
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Decision buttons */}
        {!isAlreadyDecided && plan && plan.status === 'submitted' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={approving || rejecting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              {approving ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
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
      </div>

      {/* Reject / Return modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Return Plan for Revision</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason. The planning manager will be able to update and resubmit.
            </p>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain what needs to be revised..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
            />
            {actionError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); setActionError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
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
    </AppLayout>
  );
};

export default DirectorPlanReviewPage;

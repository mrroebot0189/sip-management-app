import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardCheck,
  ArrowLeft,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { feasibilityReviewsApi } from '../services/api';
import { SipProjectWithReview, SipPriority } from '../types';

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

const FeasibilityDecisionPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState<SipProjectWithReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    feasibilityReviewsApi
      .getByProjectId(projectId)
      .then((res) => setProjectData(res.data.data))
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleAccept = async () => {
    if (!projectId) return;
    setSubmitting(true);
    setActionMessage('');
    try {
      await feasibilityReviewsApi.directorAccept(projectId);
      setActionMessage('Feasibility accepted. The project will now proceed to planning.');
      setTimeout(() => navigate('/director/feasibility-reviews'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to accept feasibility review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!projectId) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a reason for rejection.');
      return;
    }
    setSubmitting(true);
    setRejectError('');
    try {
      await feasibilityReviewsApi.directorReject(projectId, rejectionReason.trim());
      setShowRejectModal(false);
      setActionMessage('Feasibility rejected. Cyber Security has been notified to review the decision.');
      setTimeout(() => navigate('/director/feasibility-reviews'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setRejectError(msg || 'Failed to submit rejection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Feasibility Review Decision">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error && !projectData) {
    return (
      <AppLayout title="Feasibility Review Decision">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </AppLayout>
    );
  }

  const project = projectData!;
  const review = project.feasibilityReview;

  return (
    <AppLayout title="Feasibility Review Decision">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/director/feasibility-reviews')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feasibility Reviews
        </button>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feasibility Review Decision</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Review the submitted feasibility assessment and make your decision
            </p>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Project Details */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Project Details</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Title</p>
              <p className="text-gray-900 font-medium">{project.improvementTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Department</p>
                <p className="text-gray-800">{project.department?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Priority</p>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[project.priority]}`}>
                  {PRIORITY_LABELS[project.priority]}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Problem / Weakness</p>
              <p className="text-gray-800 whitespace-pre-wrap">{project.projectProblem}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Desired Outcomes</p>
              <p className="text-gray-800 whitespace-pre-wrap">{project.desiredOutcomes}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Risk</p>
              <p className="text-gray-800 whitespace-pre-wrap">{project.risk}</p>
            </div>
          </div>
        </div>

        {/* Feasibility Assessment */}
        {review ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-green-600" />
              <h2 className="font-semibold text-gray-800">Feasibility Assessment</h2>
              <span className="ml-auto text-xs text-gray-500">
                Reviewed by{' '}
                <strong>
                  {project.feasibilityReviewer
                    ? `${project.feasibilityReviewer.firstName} ${project.feasibilityReviewer.lastName}`
                    : '—'}
                </strong>
                {review.submittedAt && (
                  <>
                    {' '}on {new Date(review.submittedAt).toLocaleDateString('en-GB')}
                  </>
                )}
              </span>
            </div>
            <div className="px-6 py-5 space-y-5">
              {review.suggestedSolution && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Suggested Solution</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{review.suggestedSolution}</p>
                </div>
              )}

              {/* Resources */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resources <span className="normal-case font-normal">(person days)</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Implementation resource</p>
                    <p className="text-gray-800">{review.setupResources != null ? review.setupResources : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Annual resource</p>
                    <p className="text-gray-800">{review.annualOngoingResources != null ? review.annualOngoingResources : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Costs</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Implementation cost</p>
                    <p className="text-gray-800">{review.setupCosts != null ? `£${review.setupCosts}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Annual cost</p>
                    <p className="text-gray-800">{review.annualOngoingCost != null ? `£${review.annualOngoingCost}` : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Conclusion */}
              {review.conclusion && (
                <div className={`rounded-lg px-4 py-3 border ${review.conclusion === 'proceed' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">Conclusion</p>
                  <p className="font-semibold text-sm">
                    {review.conclusion === 'proceed'
                      ? 'Proceed – benefits outweigh costs'
                      : 'Do not proceed – costs outweigh benefits'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm mb-6">
            No feasibility review has been submitted for this project yet.
          </div>
        )}

        {/* Decision buttons – only show if project is still in feasibility assessment */}
        {(project.status === 'feasibility_assessment' || project.status === 'under_review') && review?.status === 'submitted' && !actionMessage && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
            <h2 className="font-semibold text-gray-800 mb-4">Your Decision</h2>
            <p className="text-sm text-gray-500 mb-5">
              Based on the feasibility assessment above, please indicate whether you accept or reject this project proceeding to planning.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Processing…' : 'Accept – Proceed to Planning'}
              </button>
              <button
                onClick={() => { setShowRejectModal(true); setRejectError(''); }}
                disabled={submitting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Already decided */}
        {project.status !== 'feasibility_assessment' && project.status !== 'under_review' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-600 text-sm">
            A decision has already been recorded for this project (status: <strong>{project.status.replace(/_/g, ' ')}</strong>).
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Reject Feasibility Review</h3>
              <p className="text-sm text-gray-500 mt-1">
                Please provide the reason why you are not proceeding with this project. This will be sent to the Cyber Security team who may review your decision.
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Detail why you will not proceed with this project…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              {rejectError && (
                <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {rejectError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={submitting || !rejectionReason.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {submitting ? 'Submitting…' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default FeasibilityDecisionPage;

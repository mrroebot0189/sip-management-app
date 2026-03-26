import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ChevronDown,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { sipProjectsApi, usersApi } from '../services/api';
import { SipProject, User as UserType } from '../types';

const ProjectApprovalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<SipProject | null>(null);
  const [reviewers, setReviewers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      sipProjectsApi.getById(id),
      usersApi.getForReview(),
    ])
      .then(([projRes, usersRes]) => {
        setProject(projRes.data.data);
        setReviewers(usersRes.data.data || []);
      })
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApproveSubmit = async () => {
    if (!selectedReviewer) {
      setApproveError('Please select a reviewer.');
      return;
    }
    setApproving(true);
    setApproveError('');
    try {
      await sipProjectsApi.approve(id!, selectedReviewer);
      navigate('/director/new-projects', { state: { successMessage: 'Project approved. The reviewer has been notified.' } });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to approve project.';
      setApproveError(message);
      setApproving(false);
    }
  };

  const handleRejectClick = () => {
    navigate(`/director/projects/${id}/reject`);
  };

  if (loading) {
    return (
      <AppLayout title="Project Details">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout title="Project Details">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error || 'Project not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }

  const alreadyActioned = project.status !== 'new';

  return (
    <AppLayout title="Project Details">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/director/new-projects')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to New Projects
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{project.improvementTitle}</h1>
        </div>

        {/* Already actioned banner */}
        {alreadyActioned && (
          <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            This project has already been actioned (status: <strong className="ml-1 capitalize">{project.status.replace(/_/g, ' ')}</strong>).
          </div>
        )}

        {/* Project details table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Project Details</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3.5 font-medium text-gray-500 bg-gray-50 w-48 align-top">
                  Improvement Title
                </td>
                <td className="px-5 py-3.5 text-gray-900">{project.improvementTitle}</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-gray-500 bg-gray-50 align-top">
                  Project Problem / Weakness
                </td>
                <td className="px-5 py-3.5 text-gray-900 whitespace-pre-wrap">
                  {project.projectProblem}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-gray-500 bg-gray-50 align-top">
                  Desired Outcomes
                </td>
                <td className="px-5 py-3.5 text-gray-900 whitespace-pre-wrap">
                  {project.desiredOutcomes}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-medium text-gray-500 bg-gray-50 align-top">
                  Risk
                </td>
                <td className="px-5 py-3.5 text-gray-900 whitespace-pre-wrap">{project.risk}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action buttons – only shown while project is still NEW */}
        {!alreadyActioned && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowApproveModal(true); setApproveError(''); }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve for Feasibility
            </button>
            <button
              onClick={handleRejectClick}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Accept modal – reviewer selection */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">Assign Feasibility Reviewer</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select the person who will conduct the feasibility review for this project.
              They will receive a login email with instructions.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Reviewer
            </label>
            <div className="relative mb-4">
              <select
                value={selectedReviewer}
                onChange={(e) => setSelectedReviewer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">— Choose a reviewer —</option>
                {reviewers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.jobTitle ? ` – ${u.jobTitle}` : ''}
                    {u.department ? ` (${u.department})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {approveError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {approveError}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={approving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveSubmit}
                disabled={approving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                {approving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ProjectApprovalPage;

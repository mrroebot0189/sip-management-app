import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, AlertCircle, ChevronRight, Clock, CheckCircle2, ShieldCheck, ChevronDown, UserPlus, Save } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { feasibilityReviewsApi, usersApi } from '../services/api';
import { SipProjectWithReview, User } from '../types';
import { useAuth } from '../contexts/AuthContext';

const FeasibilityReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState<SipProjectWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const canAssign =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'cyber' ||
    currentUser?.role === 'director' ||
    currentUser?.role === 'programme_manager' ||
    currentUser?.role === 'director_head_of';

  useEffect(() => {
    feasibilityReviewsApi
      .getAll()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load feasibility reviews.'))
      .finally(() => setLoading(false));
  }, []);

  const openAssignModal = async (projectId: string) => {
    setAssigningProjectId(projectId);
    setSelectedReviewer('');
    setAssignError('');
    setShowAssignModal(true);
    if (reviewers.length === 0) {
      try {
        const res = await usersApi.getForReview();
        setReviewers(res.data.data || []);
      } catch {
        setAssignError('Failed to load reviewers.');
      }
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedReviewer || !assigningProjectId) {
      setAssignError('Please select a reviewer.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      await feasibilityReviewsApi.cyberAssign(assigningProjectId, selectedReviewer);
      // Update the project in state to reflect new reviewer
      const reviewer = reviewers.find((r) => r.id === selectedReviewer);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === assigningProjectId
            ? {
                ...p,
                feasibilityReviewerId: selectedReviewer,
                feasibilityReviewerAssignedAt: new Date().toISOString(),
                feasibilityReviewer: reviewer
                  ? { id: reviewer.id, firstName: reviewer.firstName, lastName: reviewer.lastName, email: reviewer.email }
                  : p.feasibilityReviewer,
              }
            : p
        )
      );
      setShowAssignModal(false);
      setAssigningProjectId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAssignError(msg || 'Failed to assign reviewer.');
    } finally {
      setAssigning(false);
    }
  };

  // Split projects: cyber-accepted (cyberAcceptedAt set) vs regular
  // Cyber-accepted projects assigned to the current user appear in "Assigned Reviews"
  // so they can work on them; all other cyber-accepted projects stay in the management section.
  const cyberAcceptedProjects = projects.filter(
    (p) => p.cyberAcceptedAt && p.feasibilityReviewerId !== currentUser?.id
  );
  const allRegularProjects = projects.filter(
    (p) => !p.cyberAcceptedAt || p.feasibilityReviewerId === currentUser?.id
  );
  // Separate drafts (in-progress saves) from pending/submitted
  const draftProjects = allRegularProjects.filter((p) => p.feasibilityReview?.status === 'draft');
  const regularProjects = allRegularProjects.filter((p) => p.feasibilityReview?.status !== 'draft');

  if (loading) {
    return (
      <AppLayout title="Feasibility Reviews">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  const renderProjectRow = (project: SipProjectWithReview) => {
    const reviewStatus = project.feasibilityReview?.status ?? null;
    const isSubmitted = reviewStatus === 'submitted';

    return (
      <button
        key={project.id}
        onClick={() => navigate(`/feasibility-reviews/${project.id}`)}
        className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-blue-400 hover:shadow-md transition-all text-left group shadow-sm"
      >
        {/* Status icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSubmitted
              ? 'bg-green-100'
              : reviewStatus === 'draft'
              ? 'bg-yellow-100'
              : 'bg-blue-100'
          }`}
        >
          {isSubmitted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Clock className="w-5 h-5 text-blue-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700">
            {project.improvementTitle}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">
              {project.department?.name ?? '—'}
            </span>
            <span className="text-xs text-gray-400">
              Assigned{' '}
              {project.feasibilityReviewerAssignedAt
                ? new Date(project.feasibilityReviewerAssignedAt).toLocaleDateString('en-GB')
                : '—'}
            </span>
          </div>
        </div>

        {/* Review status badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isSubmitted
                ? 'bg-green-100 text-green-700'
                : reviewStatus === 'draft'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isSubmitted ? 'Submitted' : reviewStatus === 'draft' ? 'In Progress' : 'Pending'}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
        </div>
      </button>
    );
  };

  const renderCyberAcceptedCard = (project: SipProjectWithReview) => {
    const hasReviewer = !!project.feasibilityReviewerId;

    return (
      <div key={project.id} className="bg-white border border-purple-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{project.improvementTitle}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500">{project.department?.name ?? '—'}</span>
              {hasReviewer && project.feasibilityReviewer && (
                <span className="text-xs text-gray-400">
                  Reviewer: {project.feasibilityReviewer.firstName} {project.feasibilityReviewer.lastName}
                </span>
              )}
              {!hasReviewer && (
                <span className="text-xs text-orange-600 font-medium">No reviewer assigned</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasReviewer ? (
              <>
                {canAssign && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAssignModal(project.id); }}
                    className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Reassign
                  </button>
                )}
                <button
                  onClick={() => navigate(`/feasibility-reviews/${project.id}`)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Open
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              canAssign && (
                <button
                  onClick={() => openAssignModal(project.id)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign Reviewer
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Feasibility Reviews">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feasibility Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projects assigned to you for feasibility assessment.
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Cyber Accepted Projects section */}
        {cyberAcceptedProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-semibold text-gray-800">Cyber Accepted Projects</h2>
              <span className="ml-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {cyberAcceptedProjects.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Projects overridden by Cyber Security – assign a feasibility reviewer to proceed.
            </p>
            <div className="space-y-3">
              {cyberAcceptedProjects.map(renderCyberAcceptedCard)}
            </div>
          </div>
        )}

        {/* Draft reviews section */}
        {draftProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Save className="w-5 h-5 text-yellow-600" />
              <h2 className="text-base font-semibold text-gray-800">Drafts</h2>
              <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {draftProjects.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Reviews you have saved but not yet submitted.
            </p>
            <div className="space-y-3">
              {draftProjects.map(renderProjectRow)}
            </div>
          </div>
        )}

        {/* Regular feasibility reviews */}
        {regularProjects.length === 0 && draftProjects.length === 0 && cyberAcceptedProjects.length === 0 && !error ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 font-medium">No projects assigned for review</h3>
            <p className="text-gray-400 text-sm mt-1">
              Projects accepted by the director will appear here once assigned to you.
            </p>
          </div>
        ) : regularProjects.length > 0 ? (
          <>
            {(cyberAcceptedProjects.length > 0 || draftProjects.length > 0) && (
              <div className="flex items-center gap-2 mb-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-800">Assigned Reviews</h2>
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {regularProjects.length}
                </span>
              </div>
            )}
            <div className="space-y-3">
              {regularProjects.map(renderProjectRow)}
            </div>
          </>
        ) : null}
      </div>

      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Assign Feasibility Reviewer</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a reviewer for this cyber-accepted project.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Select Reviewer</label>
            <div className="relative mb-4">
              <select
                value={selectedReviewer}
                onChange={(e) => setSelectedReviewer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

            {assignError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {assignError}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(false); setAssigningProjectId(null); }}
                disabled={assigning}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={assigning}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    Assigning…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Assign
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

export default FeasibilityReviewsPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  FileBarChart2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Square,
  CheckSquare,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { feasibilityReviewsApi } from '../services/api';
import { SipProjectWithReview, SipPriority } from '../types';

const PRIORITY_COLOURS: Record<SipPriority, string> = {
  p1: 'bg-red-100 text-red-700 border-red-300',
  p2: 'bg-orange-100 text-orange-700 border-orange-300',
  p3: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  p4: 'bg-green-100 text-green-700 border-green-300',
};

const PRIORITY_ACTIVE_COLOURS: Record<SipPriority, string> = {
  p1: 'bg-red-600 text-white border-red-600',
  p2: 'bg-orange-500 text-white border-orange-500',
  p3: 'bg-yellow-500 text-white border-yellow-500',
  p4: 'bg-green-600 text-white border-green-600',
};

const PRIORITY_LABELS: Record<SipPriority, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const ALL_PRIORITIES: SipPriority[] = ['p1', 'p2', 'p3', 'p4'];

const CyberFeasibilityPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProjectWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  // Filter state – which priority ratings are active (empty = show all)
  const [activeRatings, setActiveRatings] = useState<Set<SipPriority>>(new Set());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  useEffect(() => {
    feasibilityReviewsApi
      .getCyberReview()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load director-rejected feasibility reviews.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (projectId: string) => {
    setSubmitting(projectId);
    try {
      await feasibilityReviewsApi.cyberAccept(projectId);
      setMessages((prev) => ({ ...prev, [projectId]: 'accepted' }));
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessages((prev) => ({ ...prev, [projectId]: `error:${msg || 'Failed to accept'}` }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleReport = async (projectId: string) => {
    setSubmitting(projectId);
    try {
      await feasibilityReviewsApi.cyberReport(projectId);
      setMessages((prev) => ({ ...prev, [projectId]: 'reported' }));
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessages((prev) => ({ ...prev, [projectId]: `error:${msg || 'Failed to report'}` }));
    } finally {
      setSubmitting(null);
    }
  };

  const handleBulkAccept = async () => {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    setBulkMessage('');
    try {
      const res = await feasibilityReviewsApi.cyberBulkAccept(Array.from(selectedIds));
      const { data: results, message } = res.data;
      const succeeded: string[] = results.filter((r: { id: string; success: boolean }) => r.success).map((r: { id: string }) => r.id);
      setProjects((prev) => prev.filter((p) => !succeeded.includes(p.id)));
      setSelectedIds(new Set());
      setBulkMessage(message || `${succeeded.length} project(s) overridden.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setBulkMessage(`error:${msg || 'Bulk override failed.'}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkReport = async () => {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    setBulkMessage('');
    try {
      const res = await feasibilityReviewsApi.cyberBulkReport(Array.from(selectedIds));
      const { data: results, message } = res.data;
      const succeeded: string[] = results.filter((r: { id: string; success: boolean }) => r.success).map((r: { id: string }) => r.id);
      setProjects((prev) => prev.filter((p) => !succeeded.includes(p.id)));
      setSelectedIds(new Set());
      setBulkMessage(message || `${succeeded.length} project(s) marked as non-implementing.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setBulkMessage(`error:${msg || 'Bulk report failed.'}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleRatingFilter = (rating: SipPriority) => {
    setActiveRatings((prev) => {
      const next = new Set(prev);
      if (next.has(rating)) {
        next.delete(rating);
      } else {
        next.add(rating);
      }
      return next;
    });
    // Clear selection when filter changes
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  // Apply priority filter
  const filteredProjects = activeRatings.size === 0
    ? projects
    : projects.filter((p) => activeRatings.has(p.priority));

  const feasibilityRejected = filteredProjects.filter((p) => p.status === 'feasibility_rejected');
  const newProjectRejected = filteredProjects.filter((p) => p.status === 'rejected');

  const visibleIds = filteredProjects.map((p) => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const renderProjectCard = (p: SipProjectWithReview) => {
    const msg = messages[p.id];
    const isExpanded = expandedId === p.id;
    const review = p.feasibilityReview;
    const isSelected = selectedIds.has(p.id);

    const isNewProjectRejection = p.status === 'rejected';
    const rejectionReason = isNewProjectRejection ? p.rejectionReason : p.feasibilityRejectionReason;
    const rejectedAt = isNewProjectRejection ? p.rejectedAt : p.feasibilityRejectedAt;

    return (
      <div key={p.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-colors ${isSelected ? 'border-blue-400 ring-1 ring-blue-300' : 'border-red-200'}`}>
        {/* Project header row */}
        <div className="px-6 py-4 flex items-center gap-3">
          {/* Checkbox */}
          <button
            onClick={() => toggleSelect(p.id)}
            className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
            title={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-gray-300 hover:text-blue-400" />}
          </button>

          <div
            className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => toggleExpand(p.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 truncate">{p.improvementTitle}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isNewProjectRejection ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {isNewProjectRejection ? 'Rejected at New Project stage' : 'Rejected at Feasibility stage'}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLOURS[p.priority]}`}>
                  {PRIORITY_LABELS[p.priority]}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {p.department?.name ?? '—'}
                {!isNewProjectRejection && (
                  <> &middot; Reviewer:{' '}
                    {p.feasibilityReviewer
                      ? `${p.feasibilityReviewer.firstName} ${p.feasibilityReviewer.lastName}`
                      : '—'}
                  </>
                )}
                {rejectedAt && (
                  <> &middot; Rejected by director on {new Date(rejectedAt).toLocaleDateString('en-GB')}</>
                )}
              </p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Director rejection reason */}
        {rejectionReason && (
          <div className="px-6 pb-2">
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Director's Rejection Reason</p>
              <p className="text-sm text-red-800 whitespace-pre-wrap">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Expanded feasibility review details */}
        {isExpanded && review && (
          <div className="px-6 pb-4 border-t border-gray-100 mt-2 pt-4 space-y-4">
            <h4 className="font-semibold text-gray-700 text-sm">Feasibility Assessment Details</h4>

            {/* Resources */}
            <div className="text-sm">
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
            <div className="text-sm">
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
          </div>
        )}

        {/* Action area */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
          {msg && msg.startsWith('error:') ? (
            <p className="text-red-600 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {msg.replace('error:', '')}
            </p>
          ) : msg === 'accepted' ? (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {isNewProjectRejection ? 'Overridden – moved to Feasibility Review.' : 'Overridden – moved to Planning.'}
            </p>
          ) : msg === 'reported' ? (
            <p className="text-gray-600 text-sm flex items-center gap-1">
              <FileBarChart2 className="w-4 h-4" /> Marked as non-implementing.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 flex-1">
                {isNewProjectRejection
                  ? 'Override the director\'s rejection and proceed to feasibility review, or confirm as non-implementing.'
                  : 'Override the director\'s decision and proceed to planning, or confirm as non-implementing.'}
              </p>
              <button
                onClick={() => handleAccept(p.id)}
                disabled={submitting === p.id || bulkSubmitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting === p.id ? 'Processing…' : isNewProjectRejection ? 'Override – Proceed to Feasibility Review' : 'Override – Proceed to Planning'}
              </button>
              <button
                onClick={() => handleReport(p.id)}
                disabled={submitting === p.id || bulkSubmitting}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <FileBarChart2 className="w-4 h-4" />
                {submitting === p.id ? 'Processing…' : 'Accept as Non-Implementing'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Cyber Security – Feasibility Decisions">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feasibility Decisions</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Review director-rejected projects and either accept (override) or report as non-implementing.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No director-rejected projects to action at this time.</p>
            <button
              onClick={() => navigate('/cyber/non-implementing')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              View Non-Implementing Projects →
            </button>
          </div>
        ) : (
          <>
            {/* Filter + Select All bar */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Filter className="w-4 h-4" />
                Filter by P Rating:
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ALL_PRIORITIES.map((rating) => {
                  const isActive = activeRatings.has(rating);
                  const count = projects.filter((p) => p.priority === rating).length;
                  return (
                    <button
                      key={rating}
                      onClick={() => toggleRatingFilter(rating)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isActive ? PRIORITY_ACTIVE_COLOURS[rating] : PRIORITY_COLOURS[rating]
                      }`}
                    >
                      {PRIORITY_LABELS[rating]}
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs ${isActive ? 'bg-white/30' : 'bg-white/60'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                {activeRatings.size > 0 && (
                  <button
                    onClick={() => { setActiveRatings(new Set()); setSelectedIds(new Set()); }}
                    className="text-xs text-gray-500 hover:text-gray-800 underline ml-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-700 transition-colors"
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allVisibleSelected ? 'Deselect all' : `Select all (${visibleIds.length})`}
                </button>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-blue-800">
                  {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                {bulkMessage && (
                  <span className={`text-sm flex items-center gap-1 ${bulkMessage.startsWith('error:') ? 'text-red-600' : 'text-green-700'}`}>
                    {bulkMessage.startsWith('error:') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {bulkMessage.replace('error:', '')}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleBulkAccept}
                    disabled={bulkSubmitting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {bulkSubmitting ? 'Processing…' : `Bulk Override (${selectedIds.size})`}
                  </button>
                  <button
                    onClick={handleBulkReport}
                    disabled={bulkSubmitting}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <FileBarChart2 className="w-4 h-4" />
                    {bulkSubmitting ? 'Processing…' : `Bulk Non-Implementing (${selectedIds.size})`}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            )}

            {/* No results after filter */}
            {filteredProjects.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-10">
                <Filter className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No projects match the selected P rating filter.</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Feasibility Rejections */}
              {feasibilityRejected.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Feasibility Rejections</h2>
                    <span className="ml-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {feasibilityRejected.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {feasibilityRejected.map(renderProjectCard)}
                  </div>
                </section>
              )}

              {/* New Project Rejections */}
              {newProjectRejected.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-gray-800">New Project Rejections</h2>
                    <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {newProjectRejected.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {newProjectRejected.map(renderProjectCard)}
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {!loading && projects.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/cyber/non-implementing')}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              View Non-Implementing Projects Archive →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CyberFeasibilityPage;

import React, { useEffect, useState } from 'react';
import { AlertCircle, FileBarChart2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { feasibilityReviewsApi } from '../services/api';
import { SipProjectWithReview } from '../types';

const NonImplementingPage: React.FC = () => {
  const [projects, setProjects] = useState<SipProjectWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    feasibilityReviewsApi
      .getNonImplementing()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load non-implementing projects.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <AppLayout title="Non-Implementing Projects">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileBarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Non-Implementing Projects</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Projects confirmed as not feasible to implement. These are retained for board reporting purposes.
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-16">
            <FileBarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No non-implementing projects at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => {
              const isExpanded = expandedId === p.id;
              const review = p.feasibilityReview;

              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Row header */}
                  <div
                    className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(p.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 truncate">{p.improvementTitle}</h3>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          Non-Implementing
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {p.department?.name ?? '—'}
                        {p.cyberReportedAt && (
                          <> &middot; Reported on {new Date(p.cyberReportedAt).toLocaleDateString('en-GB')}</>
                        )}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Director rejection reason */}
                  {p.feasibilityRejectionReason && (
                    <div className="px-6 pb-2">
                      <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Director's Rejection Reason</p>
                        <p className="text-sm text-red-800 whitespace-pre-wrap">{p.feasibilityRejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      {/* Project info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700 text-sm">Project Information</h4>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Project Problem</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.projectProblem}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Desired Outcomes</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.desiredOutcomes}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Risk</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.risk}</p>
                        </div>
                      </div>

                      {/* Feasibility summary */}
                      {review && (
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                          <h4 className="font-semibold text-gray-700 text-sm">Feasibility Assessment Summary</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated Duration</p>
                              <p className="text-gray-800">{review.estimatedDuration || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated Effort</p>
                              <p className="text-gray-800">{review.estimatedEffort || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Setup Costs</p>
                              <p className="text-gray-800">{review.setupCosts != null ? `£${review.setupCosts}` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Annual Ongoing Cost</p>
                              <p className="text-gray-800">{review.annualOngoingCost != null ? `£${review.annualOngoingCost}` : '—'}</p>
                            </div>
                          </div>
                          {review.potentialRisks && (
                            <div className="text-sm">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Potential Risks</p>
                              <p className="text-gray-800 whitespace-pre-wrap">{review.potentialRisks}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NonImplementingPage;

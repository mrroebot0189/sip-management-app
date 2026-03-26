import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Clock,
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

const DirectorFeasibilityReviewListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProjectWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    feasibilityReviewsApi
      .getSubmitted()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load feasibility reviews.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout title="Feasibility Reviews">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Feasibility Reviews">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feasibility Reviews</h1>
            <p className="text-gray-500 text-sm mt-1">
              Submitted feasibility assessments awaiting your approval
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">
            {projects.length} review{projects.length !== 1 ? 's' : ''} pending
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
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No feasibility reviews awaiting approval</p>
            <p className="text-gray-400 text-sm mt-1">
              Reviews will appear here once the assigned reviewer has submitted their assessment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/director/feasibility/${project.id}/review`)}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{project.improvementTitle}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 flex-shrink-0">
                        Awaiting Director Approval
                      </span>
                      {project.priority && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${PRIORITY_COLOURS[project.priority]}`}>
                          {PRIORITY_LABELS[project.priority]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span>{project.department?.name ?? '—'}</span>
                      {project.feasibilityReviewer && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>
                            Reviewer: {project.feasibilityReviewer.firstName} {project.feasibilityReviewer.lastName}
                          </span>
                        </>
                      )}
                      {project.feasibilityReview?.submittedAt && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>
                            Submitted: {new Date(project.feasibilityReview.submittedAt).toLocaleDateString('en-GB')}
                          </span>
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

export default DirectorFeasibilityReviewListPage;

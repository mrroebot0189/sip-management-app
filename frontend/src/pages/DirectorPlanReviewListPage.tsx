import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  FolderOpen,
  Clock,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { projectPlansApi } from '../services/api';
import { SipProjectWithPlan } from '../types';

const DirectorPlanReviewListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    projectPlansApi
      .getForDirectorReview()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load plans for review.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout title="Plan Reviews">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Plan Reviews">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Plan Reviews</h1>
            <p className="text-gray-500 text-sm mt-1">
              Submitted project plans awaiting your review and approval
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">
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
            <p className="text-gray-500 font-medium">No plans awaiting review</p>
            <p className="text-gray-400 text-sm mt-1">
              Project plans will appear here once they have been submitted by the planning team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/director/plan-review/${project.id}`)}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 truncate">{project.improvementTitle}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Awaiting Director Review
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
                      {project.projectPlan?.submittedAt && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>Submitted: {new Date(project.projectPlan.submittedAt).toLocaleDateString()}</span>
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

export default DirectorPlanReviewListPage;

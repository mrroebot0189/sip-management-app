import React from 'react';
import { useQuery } from 'react-query';
import { Archive, Building2, Calendar, CheckCircle, User } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { projectTrackingApi } from '../services/api';
import { ActiveProject } from '../types';
import { format } from 'date-fns';

const ClosedProjectsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery('closed-projects', () =>
    projectTrackingApi.getClosed().then((r) => r.data.data as ActiveProject[])
  );

  if (isLoading) return <AppLayout><LoadingSpinner size="lg" className="min-h-[60vh]" /></AppLayout>;
  if (error) return <AppLayout><div className="p-8 text-red-600">Failed to load closed projects.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Closed Projects</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">
            Projects that have been completed and formally verified closed by Cyber Security.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">
              {data?.length ?? 0} project{(data?.length ?? 0) !== 1 ? 's' : ''} closed &amp; verified
            </span>
          </div>
        </div>

        {!data || data.length === 0 ? (
          <EmptyState
            icon={<Archive className="w-10 h-10 text-gray-300" />}
            title="No closed projects yet"
            description="Projects verified by Cyber Security as closed will appear here as a permanent record."
          />
        ) : (
          <div className="space-y-3">
            {data.map((project) => (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-800">{project.improvementTitle}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 flex-shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Closed &amp; Verified
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="w-3.5 h-3.5" />
                        {(project as any).department?.name || 'Unknown'}
                      </span>
                      {(project as any).createdBy && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3.5 h-3.5" />
                          {(project as any).createdBy.firstName} {(project as any).createdBy.lastName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Closed {format(new Date(project.updatedAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  {project.projectPlan?.timelineStart && (
                    <div>
                      <span className="text-xs text-gray-400 uppercase font-semibold">Started</span>
                      <p className="text-gray-700 mt-0.5">{format(new Date(project.projectPlan.timelineStart), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                  {project.projectPlan?.timelineEnd && (
                    <div>
                      <span className="text-xs text-gray-400 uppercase font-semibold">Planned End</span>
                      <p className="text-gray-700 mt-0.5">{format(new Date(project.projectPlan.timelineEnd), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ClosedProjectsPage;

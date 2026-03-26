import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Building2,
  CheckCircle,
  ClipboardCheck,
  ShieldCheck,
  User,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { projectTrackingApi } from '../services/api';
import { ActiveProject } from '../types';
import { format } from 'date-fns';

const CompletedProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery('completed-projects', () =>
    projectTrackingApi.getCompleted().then((r) => r.data.data as ActiveProject[])
  );

  const mutation = useMutation(
    (projectId: string) => projectTrackingApi.verifyClosure(projectId),
    {
      onSuccess: (_data, projectId) => {
        setSuccessId(projectId);
        setConfirmId(null);
        queryClient.invalidateQueries('completed-projects');
        queryClient.invalidateQueries('active-projects');
      },
      onError: () => {
        setConfirmId(null);
      },
    }
  );

  if (isLoading) return <AppLayout><LoadingSpinner size="lg" className="min-h-[60vh]" /></AppLayout>;
  if (error) return <AppLayout><div className="p-8 text-red-600">Failed to load completed projects.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Completed Projects</h1>
          </div>
          <p className="text-gray-500 text-sm ml-12">
            Projects marked as complete by their teams. Validate closure to formally close them.
          </p>
        </div>

        {/* Count badge */}
        {data && data.length > 0 && (
          <div className="mb-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {data.length} project{data.length > 1 ? 's' : ''} awaiting closure validation
            </span>
          </div>
        )}

        {!data || data.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-10 h-10 text-gray-300" />}
            title="No projects awaiting validation"
            description="When a project team marks a project as complete, it will appear here for Cyber Security to validate."
          />
        ) : (
          <div className="space-y-4">
            {data.map((project) => {
              const latestUpdate = project.statusUpdates?.[0];
              const isSuccess = successId === project.id;

              return (
                <div
                  key={project.id}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isSuccess ? 'border-green-400' : 'border-gray-200'}`}
                >
                  {isSuccess && (
                    <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 text-sm font-semibold">Closure verified successfully</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">{project.improvementTitle}</h3>
                        <div className="flex flex-wrap gap-3 mt-1.5">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Project Complete
                          </span>
                        </div>
                      </div>
                    </div>

                    {latestUpdate && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Completion Note</p>
                        <p className="text-sm text-gray-700">{latestUpdate.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {latestUpdate.submittedBy
                            ? `${latestUpdate.submittedBy.firstName} ${latestUpdate.submittedBy.lastName}`
                            : 'Unknown'}{' '}
                          – {format(new Date(latestUpdate.submittedAt), 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      {confirmId === project.id ? (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-gray-600">Confirm closure validation?</p>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => mutation.mutate(project.id)}
                            disabled={mutation.isLoading}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {mutation.isLoading && verifyingId === project.id ? 'Verifying…' : 'Confirm & Verify'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmId(project.id); setVerifyingId(project.id); }}
                          disabled={isSuccess}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {isSuccess ? 'Verified' : 'Validate Closure'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CompletedProjectsPage;

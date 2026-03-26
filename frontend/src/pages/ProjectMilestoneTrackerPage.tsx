import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Target,
  User as UserIcon,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { projectTrackingApi, projectPlansApi } from '../services/api';
import { ActiveProject, ProjectMilestone } from '../types';
import { format, isAfter, parseISO, differenceInDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const milestoneIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (status === 'overdue') return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />;
};

const completionBadge = (milestone: ProjectMilestone) => {
  if (milestone.status !== 'completed' || !milestone.completedAt) return null;
  const due = parseISO(milestone.dueDate);
  const achieved = parseISO(milestone.completedAt);
  const diff = differenceInDays(achieved, due);
  if (diff <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        On time
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
      {diff}d late
    </span>
  );
};

const ProjectMilestoneTrackerPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isCyberOrAdmin = user?.role === 'cyber' || user?.role === 'admin';

  const { data: project, isLoading, error } = useQuery(
    ['project-details', projectId],
    () => projectTrackingApi.getProjectById(projectId!).then((r) => r.data.data as ActiveProject),
    { enabled: !!projectId }
  );

  const toggleMutation = useMutation(
    (milestoneId: string) => projectPlansApi.toggleMilestone(milestoneId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-details', projectId]);
        queryClient.invalidateQueries('active-projects');
      },
    }
  );

  if (isLoading) return <AppLayout><LoadingSpinner size="lg" className="min-h-[60vh]" /></AppLayout>;
  if (error || !project) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Failed to load project details.
          </div>
        </div>
      </AppLayout>
    );
  }

  const milestones = (project.projectPlan?.milestones || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const overdueCount = milestones.filter((m) => m.status === 'overdue').length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/active-projects')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Active Projects
        </button>

        {/* Project header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.improvementTitle}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Building2 className="w-4 h-4" />
                  {project.department?.name || 'Unknown'}
                </span>
                {project.projectPlan?.projectOwner && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <UserIcon className="w-4 h-4" />
                    {project.projectPlan.projectOwner}
                  </span>
                )}
                {project.activeStartDate && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Started {format(parseISO(project.activeStartDate), 'dd MMM yyyy')}
                  </span>
                )}
                {project.projectPlan?.timelineEnd && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Due {format(parseISO(project.projectPlan.timelineEnd), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-blue-600">{progressPct}%</div>
              <div className="text-xs text-gray-400">complete</div>
            </div>
          </div>

          {/* Overall progress bar */}
          {milestones.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {completedCount} of {milestones.length} milestones achieved
                </span>
                {overdueCount > 0 && (
                  <span className="text-red-600 font-medium">{overdueCount} overdue</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Milestone tracker */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Milestone Tracker</h2>
          </div>

          {milestones.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No milestones have been defined for this project.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="w-5" />
                <div>Milestone</div>
                <div className="text-right w-28">Due Date</div>
                <div className="text-right w-32">Achieved</div>
                <div className="w-24" />
              </div>

              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-start transition-colors ${
                    milestone.status === 'completed' ? 'bg-green-50/30' :
                    milestone.status === 'overdue' ? 'bg-red-50/30' : ''
                  }`}
                >
                  {/* Status icon */}
                  <div className="pt-0.5">{milestoneIcon(milestone.status)}</div>

                  {/* Title & details */}
                  <div>
                    <p className={`text-sm font-medium ${milestone.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {milestone.title}
                    </p>
                    {milestone.details && (
                      <p className="text-xs text-gray-400 mt-0.5">{milestone.details}</p>
                    )}
                    <div className="mt-1">{completionBadge(milestone)}</div>
                  </div>

                  {/* Due date */}
                  <div className="text-right w-28 pt-0.5">
                    <span className={`text-xs ${
                      milestone.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {format(parseISO(milestone.dueDate), 'dd MMM yyyy')}
                    </span>
                  </div>

                  {/* Achievement date */}
                  <div className="text-right w-32 pt-0.5">
                    {milestone.status === 'completed' && milestone.completedAt ? (
                      <span className="text-xs text-green-700 font-semibold">
                        {format(parseISO(milestone.completedAt), 'dd MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  {/* Toggle button */}
                  <div className="w-24 flex justify-end pt-0.5">
                    {(isCyberOrAdmin || true) && (
                      <button
                        onClick={() => toggleMutation.mutate(milestone.id)}
                        disabled={toggleMutation.isLoading}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          milestone.status === 'completed'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {milestone.status === 'completed' ? 'Undo' : 'Complete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status update history */}
        {project.statusUpdates && project.statusUpdates.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Recent Status Updates</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {project.statusUpdates.slice(0, 5).map((update) => (
                <div key={update.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        update.isUrgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {update.status.replace(/_/g, ' ')}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{update.comment}</p>
                    </div>
                    <div className="text-xs text-gray-400 text-right flex-shrink-0">
                      <div>{update.submittedBy ? `${update.submittedBy.firstName} ${update.submittedBy.lastName}` : ''}</div>
                      <div>{format(parseISO(update.submittedAt), 'dd MMM yyyy')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProjectMilestoneTrackerPage;

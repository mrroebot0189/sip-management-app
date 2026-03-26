import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Target,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import StatusUpdateModal from '../components/common/StatusUpdateModal';
import { projectTrackingApi, departmentsApi } from '../services/api';
import { ActiveProject, ProjectTrackingStatus, Department } from '../types';
import { format } from 'date-fns';

const TRACKING_STATUS_LABELS: Record<ProjectTrackingStatus, string> = {
  started: 'Started',
  on_track: 'On Track',
  not_started: 'Not Started',
  in_planning: 'In Planning',
  on_hold: 'On Hold',
  delayed: 'Delayed',
  blocked: 'Blocked',
  escalation_needed: 'Escalation Needed',
  project_complete: 'Project Complete',
  closed_and_verified: 'Closed & Verified',
};

const statusBadge = (status: ProjectTrackingStatus) => {
  const map: Record<string, string> = {
    on_track: 'bg-green-100 text-green-800',
    started: 'bg-blue-100 text-blue-800',
    project_complete: 'bg-emerald-100 text-emerald-800',
    closed_and_verified: 'bg-gray-100 text-gray-700',
    blocked: 'bg-red-100 text-red-800',
    on_hold: 'bg-red-100 text-red-800',
    escalation_needed: 'bg-red-100 text-red-800',
    delayed: 'bg-orange-100 text-orange-800',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const ProjectTimeline: React.FC<{ project: ActiveProject; onUpdateClick: (id: string) => void }> = ({
  project,
  onUpdateClick,
}) => {
  const [expanded, setExpanded] = useState(true);
  const milestones = (project.projectPlan?.milestones || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const latestUpdate = project.statusUpdates?.[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{project.improvementTitle}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5">
              {project.activeStartDate && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  Started {format(new Date(project.activeStartDate), 'dd MMM yyyy')}
                </span>
              )}
              {project.projectPlan?.timelineEnd && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Flag className="w-3.5 h-3.5" />
                  Target {format(new Date(project.projectPlan.timelineEnd), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {latestUpdate && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(latestUpdate.status)}`}>
                {TRACKING_STATUS_LABELS[latestUpdate.status]}
              </span>
            )}
            <button
              onClick={() => onUpdateClick(project.id)}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
          </div>
        </div>

        {milestones.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-500" />
                Milestones ({completedCount}/{milestones.length})
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%` }}
              />
            </div>
            {expanded && (
              <div className="relative ml-2">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="flex items-start gap-4 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                        m.status === 'completed' ? 'bg-green-500 border-green-500' :
                        m.status === 'overdue' ? 'bg-red-100 border-red-400' :
                        'bg-white border-gray-300'
                      }`}>
                        {m.status === 'completed' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <span className="text-xs text-gray-400 font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(m.dueDate), 'dd MMM yy')}
                            </span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              m.status === 'completed' ? 'bg-green-100 text-green-700' :
                              m.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                        {m.completedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Completed {format(new Date(m.completedAt), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {latestUpdate && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Latest Update</p>
            <p className="text-sm text-gray-700">{latestUpdate.comment}</p>
            <p className="text-xs text-gray-400 mt-1">
              {latestUpdate.submittedBy ? `${latestUpdate.submittedBy.firstName} ${latestUpdate.submittedBy.lastName}` : ''} –{' '}
              {format(new Date(latestUpdate.submittedAt), 'dd MMM yyyy')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const DepartmentTrackerPage: React.FC = () => {
  const { deptId } = useParams<{ deptId: string }>();
  const [selectedProject, setSelectedProject] = useState<ActiveProject | null>(null);

  const { data: projects, isLoading, refetch } = useQuery(
    ['dept-tracker', deptId],
    () => projectTrackingApi.getDepartmentTracker(deptId!).then((r) => r.data.data as ActiveProject[]),
    { enabled: !!deptId }
  );

  const { data: deptData } = useQuery(
    'departments',
    () => departmentsApi.getAll().then((r) => r.data.data as Department[])
  );

  const department = deptData?.find((d) => d.id === deptId);
  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const completedProjects = projects?.filter((p) => p.status !== 'active') || [];

  if (isLoading) return <AppLayout><LoadingSpinner size="lg" className="min-h-[60vh]" /></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {department?.name || 'Department'} Tracker
              </h1>
              <p className="text-gray-500 text-sm">Project timelines and milestone progress</p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeProjects.length}</div>
            <div className="text-xs text-gray-500 mt-1">Active</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {projects?.filter((p) => p.statusUpdates?.[0]?.status === 'on_track').length ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">On Track</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{completedProjects.length}</div>
            <div className="text-xs text-gray-500 mt-1">Completed</div>
          </div>
        </div>

        {/* Active projects */}
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Active Projects</h2>
        {activeProjects.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-10 h-10 text-gray-300" />}
            title="No active projects"
            description="This department has no active projects at the moment."
          />
        ) : (
          <div className="space-y-4 mb-8">
            {activeProjects.map((p) => (
              <ProjectTimeline
                key={p.id}
                project={p}
                onUpdateClick={(id) => {
                  const proj = (projects || []).find((x) => x.id === id) || null;
                  setSelectedProject(proj);
                }}
              />
            ))}
          </div>
        )}

        {/* Completed section */}
        {completedProjects.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Completed / Closed</h2>
            <div className="space-y-3">
              {completedProjects.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-700">{p.improvementTitle}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.status === 'closed_verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {p.status === 'closed_verified' ? 'Closed & Verified' : 'Awaiting Verification'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedProject && (
        <Modal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          title="Update Project Status"
          size="md"
        >
          <StatusUpdateModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onSuccess={() => {
              setSelectedProject(null);
              refetch();
            }}
          />
        </Modal>
      )}
    </AppLayout>
  );
};

export default DepartmentTrackerPage;

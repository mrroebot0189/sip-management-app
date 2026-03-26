import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Target,
  Zap,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/common/Modal';
import StatusUpdateModal from '../components/common/StatusUpdateModal';
import { projectTrackingApi } from '../services/api';
import { ActiveProject, ProjectTrackingStatus } from '../types';
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

const statusBadgeClass = (status: ProjectTrackingStatus): string => {
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


const ProjectCard: React.FC<{
  project: ActiveProject;
  onUpdateClick: (id: string) => void;
  onTrackerClick: (id: string) => void;
}> = ({ project, onUpdateClick, onTrackerClick }) => {
  const [expanded, setExpanded] = useState(false);
  const milestones = (project.projectPlan?.milestones || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const latestUpdate = project.statusUpdates?.[0];
  const dept = (project as { department?: { id: string; name: string } }).department;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{project.improvementTitle}</h3>
            {dept && (
              <p className="text-sm text-gray-500 mt-0.5">{dept.name}</p>
            )}
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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass(latestUpdate.status)}`}>
                {TRACKING_STATUS_LABELS[latestUpdate.status]}
              </span>
            )}
            <button
              onClick={() => onUpdateClick(project.id)}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Status
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
                style={{
                  width: `${milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%`,
                }}
              />
            </div>
            {expanded && (
              <div className="relative ml-2 mb-2">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div key={m.id} className="flex items-start gap-4 relative">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                          m.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : m.status === 'overdue'
                            ? 'bg-red-100 border-red-400'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {m.status === 'completed' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <span className="text-xs text-gray-400 font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              m.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'
                            }`}
                          >
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(m.dueDate), 'dd MMM yy')}
                            </span>
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                m.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : m.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
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
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Latest Update</p>
            <p className="text-sm text-gray-700">{latestUpdate.comment}</p>
            <p className="text-xs text-gray-400 mt-1">
              {latestUpdate.submittedBy
                ? `${latestUpdate.submittedBy.firstName} ${latestUpdate.submittedBy.lastName}`
                : ''}{' '}
              – {format(new Date(latestUpdate.submittedAt), 'dd MMM yyyy')}
            </p>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => onTrackerClick(project.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View Milestones
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState<ActiveProject | null>(null);

  const fetchProjects = () => {
    projectTrackingApi
      .getActive()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load active projects.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusUpdateSuccess = (projectId: string, status: ProjectTrackingStatus, comment: string) => {
    // Refresh the project list so the latest status badge updates
    projectTrackingApi
      .getActive()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => {});
  };

  if (loading) {
    return (
      <AppLayout title="Active Projects">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Active Projects">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const STATUS_DISPLAY_ORDER: ProjectTrackingStatus[] = [
    'started',
    'on_track',
    'in_planning',
    'not_started',
    'delayed',
    'on_hold',
    'blocked',
    'escalation_needed',
  ];

  const STATUS_TEXT_COLOR: Record<string, string> = {
    on_track: 'text-green-600',
    started: 'text-blue-600',
    in_planning: 'text-blue-400',
    not_started: 'text-gray-500',
    delayed: 'text-orange-500',
    on_hold: 'text-red-500',
    blocked: 'text-red-600',
    escalation_needed: 'text-red-700',
  };

  const statusCounts = STATUS_DISPLAY_ORDER.map((status) => ({
    status,
    label: TRACKING_STATUS_LABELS[status],
    count: projects.filter((p) => p.statusUpdates?.[0]?.status === status).length,
    textColor: STATUS_TEXT_COLOR[status] ?? 'text-gray-500',
  })).filter((s) => s.count > 0);

  return (
    <AppLayout title="Active Projects">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Projects</h1>
            <p className="text-gray-500 text-sm mt-1">
              Projects currently in implementation
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Stats */}
        {projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
              <div className="text-xs text-gray-500 mt-1">Active</div>
            </div>
            {statusCounts.map(({ status, label, count, textColor }) => (
              <div key={status} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                <div className={`text-2xl font-bold ${textColor}`}>{count}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No active projects</p>
            <p className="text-gray-400 text-sm mt-1">
              Projects will appear here once they have been activated from the planning stage.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUpdateClick={(id) => {
                  const p = projects.find((proj) => proj.id === id) || null;
                  setSelectedProject(p);
                }}
                onTrackerClick={(id) => navigate(`/active-projects/${id}/tracker`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
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
            onSuccess={handleStatusUpdateSuccess}
          />
        </Modal>
      )}
    </AppLayout>
  );
};

export default ActiveProjectsPage;

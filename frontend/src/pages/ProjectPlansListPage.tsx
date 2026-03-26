import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  AlertCircle,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  Rocket,
  Wallet,
  Play,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { projectPlansApi, projectTrackingApi } from '../services/api';
import { SipProjectWithPlan } from '../types';

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  feasibility_accepted: {
    label: 'Ready to Plan',
    className: 'bg-green-100 text-green-800',
    icon: <ClipboardList className="w-3.5 h-3.5" />,
  },
  in_planning: {
    label: 'In Planning',
    className: 'bg-blue-100 text-blue-800',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  plan_submitted: {
    label: 'Submitted – Awaiting Director',
    className: 'bg-yellow-100 text-yellow-800',
    icon: <Send className="w-3.5 h-3.5" />,
  },
  plan_director_approved: {
    label: 'Director Approved – Awaiting Cyber',
    className: 'bg-purple-100 text-purple-800',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  plan_complete: {
    label: 'Plan Complete',
    className: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

const planStatusLabels: Record<string, string> = {
  ready: 'Ready',
  awaiting_budget_approval: 'Awaiting Budget Approval',
  resource_requested: 'Resource Requested',
  in_planning: 'In Planning',
};

const DIRECTOR_APPROVED_STATUSES = ['plan_director_approved', 'plan_complete'];
const AWAITING_BUDGET_RESOURCE_STATUSES = ['awaiting_budget_approval', 'resource_requested'];

const ProjectPlansListPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState<string | null>(null);

  const handleActivate = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivating(projectId);
    try {
      await projectTrackingApi.activateProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      navigate('/active-projects');
    } catch {
      // silently ignore – project may have already been activated by cron
    } finally {
      setActivating(null);
    }
  };

  useEffect(() => {
    projectPlansApi
      .getAll()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load planning projects.'))
      .finally(() => setLoading(false));
  }, []);

  const awaitingBudgetResourceProjects = projects.filter(
    (p) =>
      !DIRECTOR_APPROVED_STATUSES.includes(p.status) &&
      p.projectPlan != null &&
      AWAITING_BUDGET_RESOURCE_STATUSES.includes(p.projectPlan.planStatus)
  );
  const inPlanningProjects = projects.filter(
    (p) =>
      !DIRECTOR_APPROVED_STATUSES.includes(p.status) &&
      !(p.projectPlan != null && AWAITING_BUDGET_RESOURCE_STATUSES.includes(p.projectPlan.planStatus))
  );
  const readyToCommenceProjects = projects.filter((p) =>
    DIRECTOR_APPROVED_STATUSES.includes(p.status)
  );

  if (loading) {
    return (
      <AppLayout title="Planning">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Planning">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  const renderProjectCard = (project: SipProjectWithPlan) => {
    const statusInfo = statusConfig[project.status] ?? {
      label: project.status.replace(/_/g, ' '),
      className: 'bg-gray-100 text-gray-700',
      icon: null,
    };
    const plan = project.projectPlan;
    const planStatusLabel = plan ? (planStatusLabels[plan.planStatus] ?? plan.planStatus) : null;

    // Show activation button for plan_complete projects whose start date is today or past
    const startDateReached =
      project.status === 'plan_complete' &&
      plan?.timelineStart &&
      new Date(plan.timelineStart) <= new Date();

    return (
      <div
        key={project.id}
        className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${startDateReached ? 'border-green-300' : 'border-gray-200'}`}
        onClick={() => navigate(`/project-plans/${project.id}`)}
      >
        {startDateReached && (
          <div className="bg-green-50 border-b border-green-200 px-5 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-green-700 text-xs font-semibold">Start date reached – ready to begin</span>
            </div>
            <button
              onClick={(e) => handleActivate(project.id, e)}
              disabled={activating === project.id}
              className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              {activating === project.id ? 'Activating…' : 'Activate Now'}
            </button>
          </div>
        )}
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {project.improvementTitle}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </span>
              {plan && planStatusLabel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {planStatusLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              <span>{(project as { department?: { name: string } }).department?.name ?? '—'}</span>
              {plan?.projectOwner && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>Owner: {plan.projectOwner}</span>
                </>
              )}
              {plan?.timelineStart && plan?.timelineEnd && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>
                    {new Date(plan.timelineStart).toLocaleDateString()} –{' '}
                    {new Date(plan.timelineEnd).toLocaleDateString()}
                  </span>
                </>
              )}
              {plan?.directorRejectionReason && plan.status === 'director_rejected' && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-red-600">Returned for revision</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Planning">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Planning</h1>
            <p className="text-gray-500 text-sm mt-1">
              Projects that have passed feasibility and are being planned
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 text-sm font-medium">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No projects in planning</p>
            <p className="text-gray-400 text-sm mt-1">
              Projects will appear here once feasibility has been accepted by a director.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* In-planning section */}
            {inPlanningProjects.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  In Planning
                </h2>
                <div className="space-y-3">
                  {inPlanningProjects.map(renderProjectCard)}
                </div>
              </div>
            )}

            {/* Plans Awaiting Budget & Resource section */}
            {awaitingBudgetResourceProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-700">
                    Plans Awaiting Budget &amp; Resource
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                    {awaitingBudgetResourceProjects.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {awaitingBudgetResourceProjects.map(renderProjectCard)}
                </div>
              </div>
            )}

            {/* Projects Ready to Commence section */}
            {readyToCommenceProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-700">
                    Projects Ready to Commence
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {readyToCommenceProjects.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {readyToCommenceProjects.map(renderProjectCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProjectPlansListPage;

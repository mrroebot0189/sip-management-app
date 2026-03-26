import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Save,
  Send,
  CheckCircle2,
  UserPlus,
  Calendar,
  ListChecks,
  RotateCcw,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import SaveSuccessToast from '../components/common/SaveSuccessToast';
import { projectPlansApi, feasibilityReviewsApi, departmentsApi } from '../services/api';
import { SipProjectWithPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PlanForm {
  projectOwner: string;
  budgetAllocated: string;
  timelineStart: string;
  timelineEnd: string;
  keyDeliverables: string;
  scope: string;
  plannedActivities: string;
}

const emptyForm: PlanForm = {
  projectOwner: '',
  budgetAllocated: '',
  timelineStart: '',
  timelineEnd: '',
  keyDeliverables: '',
  scope: '',
  plannedActivities: '',
};


const sanitizeNumericInput = (value: string): string =>
  value
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');

const ProjectPlanFormPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState<SipProjectWithPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [actionError, setActionError] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [departmentOwners, setDepartmentOwners] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;
    projectPlansApi
      .getByProjectId(projectId)
      .then((res) => {
        const data: SipProjectWithPlan = res.data.data;
        setProjectData(data);
        if (data.departmentId) {
          departmentsApi.getAll().then((dRes) => {
            const dept = dRes.data.data?.find((d: { id: string; projectOwners?: string[] }) => d.id === data.departmentId);
            if (dept?.projectOwners) setDepartmentOwners(dept.projectOwners);
          }).catch(() => {});
        }
        if (data.projectPlan) {
          const p = data.projectPlan;
          setForm({
            projectOwner: p.projectOwner ?? '',
            budgetAllocated: p.budgetAllocated != null ? String(p.budgetAllocated) : '',
            timelineStart: p.timelineStart ? p.timelineStart.substring(0, 10) : '',
            timelineEnd: p.timelineEnd ? p.timelineEnd.substring(0, 10) : '',
            keyDeliverables: p.keyDeliverables ?? '',
            scope: p.scope ?? '',
            plannedActivities: p.plannedActivities ?? '',
          });
        }
      })
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const isPrivileged =
    user?.role === 'admin' ||
    user?.role === 'director' ||
    user?.role === 'programme_manager' ||
    user?.role === 'director_head_of';

  const planStatus = projectData?.projectPlan?.status;
  const internalPlanStatus = projectData?.projectPlan?.planStatus;
  const isLockedStatus =
    planStatus === 'submitted' || planStatus === 'director_approved' || planStatus === 'cyber_approved';
  const isAwaitingBudgetOrResource =
    internalPlanStatus === 'awaiting_budget_approval' || internalPlanStatus === 'resource_requested';
  const isReadOnly = isLockedStatus && !isPrivileged && !isAwaitingBudgetOrResource;

  const isCyberOverride = !!projectData?.cyberAcceptedAt;
  const canReturnToFeasibility =
    isCyberOverride &&
    (projectData?.status === 'feasibility_accepted' || projectData?.status === 'in_planning');

  const isSubmitted = projectData?.projectPlan?.status === 'submitted';
  const isDirectorApproved = projectData?.projectPlan?.status === 'director_approved';
  const isCyberApproved = projectData?.projectPlan?.status === 'cyber_approved';
  const isDirectorRejected = projectData?.projectPlan?.status === 'director_rejected';
  const isCyberRejected = projectData?.projectPlan?.status === 'cyber_rejected';

  const toFormData = () => ({
    projectOwner: form.projectOwner,
    budgetAllocated: form.budgetAllocated,
    timelineStart: form.timelineStart || null,
    timelineEnd: form.timelineEnd || null,
    keyDeliverables: form.keyDeliverables,
    scope: form.scope,
    plannedActivities: form.plannedActivities,
  });

  const handleSave = async () => {
    setSaving(true);
    setActionError('');
    setSaveSuccess(false);
    try {
      await projectPlansApi.save(projectId!, toFormData());
      setSaveSuccess(true);
      // Reload to get the updated plan
      const res = await projectPlansApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save plan.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.projectOwner.trim()) {
      setActionError('Project owner is required.');
      return;
    }
    if (!form.scope.trim()) {
      setActionError('Scope is required.');
      return;
    }
    if (!form.plannedActivities.trim()) {
      setActionError('High level project plan is required.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      await projectPlansApi.submit(projectId!, toFormData());
      setSubmitSuccess(true);
      const res = await projectPlansApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit plan.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToFeasibility = async () => {
    setReturnLoading(true);
    setActionError('');
    try {
      await feasibilityReviewsApi.returnToFeasibility(projectId!);
      navigate('/project-plans');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to return project to feasibility.';
      setActionError(msg);
      setShowReturnModal(false);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignEmail.trim()) return;
    setAssignLoading(true);
    setActionError('');
    try {
      const res = await projectPlansApi.assign(projectId!, assignEmail.trim());
      setAssignSuccess(res.data.message || 'Assignment email sent.');
      setShowAssignModal(false);
      setAssignEmail('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send assignment.';
      setActionError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';
  const textareaClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500';

  if (loading) {
    return (
      <AppLayout title="Project Plan">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !projectData) {
    return (
      <AppLayout title="Project Plan">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error || 'Project not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }

  const planningStatuses: string[] = [
    'feasibility_accepted', 'in_planning', 'plan_submitted', 'plan_director_approved', 'plan_complete'
  ];
  if (!planningStatuses.includes(projectData.status)) {
    return (
      <AppLayout title="Project Plan">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            This project is not currently in the planning stage.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Project Plan">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/project-plans')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planning
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{projectData.improvementTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {(projectData as { department?: { name: string } }).department?.name ?? '—'} · Project Plan
          </p>
        </div>

        {/* Status banners */}
        {isCyberApproved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            This project plan has been fully approved by Cyber Security and is ready for implementation.
          </div>
        )}
        {isDirectorApproved && !isCyberApproved && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-purple-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Plan approved by Director. Awaiting Cyber Security review.
          </div>
        )}
        {isSubmitted && !isDirectorApproved && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Plan submitted. Awaiting Director review.
          </div>
        )}
        {isLockedStatus && isPrivileged && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-amber-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            You are editing a submitted plan. Changes will be saved immediately. Use this to update dates and milestones as needed.
          </div>
        )}
        {isDirectorRejected && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <strong>Plan returned by Director for revision</strong>
            </div>
            {projectData.projectPlan?.directorRejectionReason && (
              <p className="ml-6 text-red-700">{projectData.projectPlan.directorRejectionReason}</p>
            )}
          </div>
        )}
        {isCyberRejected && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <strong>Plan returned by Cyber Security for revision</strong>
            </div>
            {projectData.projectPlan?.cyberRejectionReason && (
              <p className="ml-6 text-red-700">{projectData.projectPlan.cyberRejectionReason}</p>
            )}
          </div>
        )}
        {submitSuccess && !isSubmitted && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Plan submitted successfully. The director has been notified.
          </div>
        )}
        {assignSuccess && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {assignSuccess}
          </div>
        )}

        {/* Project objective summary */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Project Objective (from submission)</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 w-44 align-top">Improvement Title</td>
                <td className="px-5 py-3 text-gray-900">{projectData.improvementTitle}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 align-top">Problem / Weakness</td>
                <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.projectProblem}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 align-top">Desired Outcomes</td>
                <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.desiredOutcomes}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Plan form */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Project Plan</h2>
          </div>
          <div className="p-5 space-y-6">

            {/* High Level Project Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                High Level Project Plan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={form.plannedActivities}
                onChange={(e) => setForm({ ...form, plannedActivities: e.target.value })}
                disabled={isReadOnly}
                placeholder="Describe the key activities and tasks planned for this project..."
                className={textareaClass}
              />
            </div>

            {/* In Scope and Out of Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                In Scope and Out of Scope <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                disabled={isReadOnly}
                placeholder="Define what is in scope and out of scope for this project..."
                className={textareaClass}
              />
            </div>

            {/* Project Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project Owner <span className="text-red-500">*</span>
              </label>
              <select
                value={form.projectOwner}
                onChange={(e) => setForm({ ...form, projectOwner: e.target.value })}
                disabled={isReadOnly}
                className={inputClass}
              >
                <option value="">— Select a project owner —</option>
                {departmentOwners.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
                {form.projectOwner && !departmentOwners.includes(form.projectOwner) && (
                  <option value={form.projectOwner}>{form.projectOwner}</option>
                )}
              </select>
            </div>

            {/* Budget Allocated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Budget Allocated (£)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.budgetAllocated}
                onChange={(e) => setForm({ ...form, budgetAllocated: sanitizeNumericInput(e.target.value) })}
                disabled={isReadOnly}
                placeholder="e.g. 50000"
                className={inputClass}
              />
            </div>

            {/* Project Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Project Timeline
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.timelineStart}
                    onChange={(e) => setForm({ ...form, timelineStart: e.target.value })}
                    disabled={isReadOnly}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.timelineEnd}
                    onChange={(e) => setForm({ ...form, timelineEnd: e.target.value })}
                    disabled={isReadOnly}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Key Deliverables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Key Deliverables &amp; Milestones
              </label>
              <textarea
                rows={5}
                value={form.keyDeliverables}
                onChange={(e) => setForm({ ...form, keyDeliverables: e.target.value })}
                disabled={isReadOnly}
                placeholder="Describe the key deliverables and milestones for this project..."
                className={textareaClass}
              />
            </div>

          </div>
        </div>

        {/* Milestone Tracker (read-only view when milestones exist) */}
        {projectData.projectPlan?.milestones && projectData.projectPlan.milestones.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">Milestone Tracker</h2>
              <span className="text-xs text-gray-500">
                {projectData.projectPlan.milestones.filter((m) => m.status === 'completed').length} /
                {projectData.projectPlan.milestones.length} complete
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {projectData.projectPlan.milestones.map((milestone) => (
                <div key={milestone.id} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      milestone.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {milestone.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        milestone.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {milestone.title}
                    </p>
                    {milestone.details && (
                      <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{milestone.details}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(milestone.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Save success */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Draft saved successfully.
          </div>
        )}

        {/* Action buttons */}
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || submitting}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              {saving ? (
                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600" />Saving…</>
              ) : (
                <><Save className="w-4 h-4" />{isLockedStatus ? 'Save Changes' : 'Save Draft'}</>
              )}
            </button>

            {!isLockedStatus && (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={saving || submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  {submitting ? (
                    <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Submitting…</>
                  ) : (
                    <><Send className="w-4 h-4" />Submit for Director Approval</>
                  )}
                </button>

                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={saving || submitting}
                  className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-60 text-indigo-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign to Someone Else
                </button>
              </>
            )}

          </div>
        )}

        {/* Return to Feasibility – only for cyber-overridden projects in planning */}
        {canReturnToFeasibility && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Need to update the feasibility information?</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This project was moved to planning via a Cyber Security override. If the feasibility details need to be revised, you can send it back to feasibility review.
                </p>
              </div>
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Return to Feasibility
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign to someone else modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Assign Planning to Someone Else</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter the email address of the person who should complete this project plan. They will receive an email inviting them to log in and start planning.
            </p>
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              placeholder="their.email@organisation.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAssign()}
            />
            {actionError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAssignModal(false); setAssignEmail(''); setActionError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignLoading || !assignEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {assignLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Return to Feasibility confirmation modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Return to Feasibility Review?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will move the project back to Feasibility Review so the assessment information can be edited. The assigned feasibility reviewer will be notified. Once the review is updated, it can proceed to planning again.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReturnModal(false)}
                disabled={returnLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnToFeasibility}
                disabled={returnLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60"
              >
                {returnLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Confirm – Return to Feasibility
              </button>
            </div>
          </div>
        </div>
      )}

      <SaveSuccessToast
        show={saveSuccess}
        message="Your project plan has been saved successfully."
        onClose={() => setSaveSuccess(false)}
      />
    </AppLayout>
  );
};

export default ProjectPlanFormPage;

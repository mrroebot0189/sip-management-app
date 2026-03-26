import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { AlertTriangle, Calendar, ChevronLeft, ClipboardList, Clock } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { projectTrackingApi } from '../services/api';
import { ProjectTrackingStatus, ProjectStatusUpdate } from '../types';
import { format } from 'date-fns';

interface StatusOption {
  value: ProjectTrackingStatus;
  label: string;
  description: string;
  isUrgent?: boolean;
  isTerminal?: boolean;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'started', label: 'Started', description: 'Project has begun' },
  { value: 'on_track', label: 'On Track', description: 'Progress is as planned' },
  { value: 'not_started', label: 'Not Started', description: 'Project has not yet started' },
  { value: 'in_planning', label: 'In Planning', description: 'Still in planning/preparation phase' },
  { value: 'delayed', label: 'Delayed', description: 'Behind schedule but still progressing' },
  { value: 'on_hold', label: 'On Hold', description: 'Temporarily paused', isUrgent: true },
  { value: 'blocked', label: 'Blocked', description: 'Unable to proceed – external blocker', isUrgent: true },
  { value: 'escalation_needed', label: 'Escalation Needed', description: 'Requires management intervention', isUrgent: true },
  { value: 'project_complete', label: 'Project Complete', description: 'Work is complete – request closure validation', isTerminal: true },
];

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

const toDateInputValue = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const StatusUpdatePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<ProjectTrackingStatus | ''>('');
  const [comment, setComment] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const { data: project, isLoading: projectLoading } = useQuery(
    ['active-project-detail', projectId],
    () =>
      projectTrackingApi.getActive().then((r) => {
        const projects = r.data.data as any[];
        return projects.find((p) => p.id === projectId) || null;
      }),
    {
      enabled: !!projectId,
      onSuccess: (data: any) => {
        if (data?.projectPlan) {
          setNewStartDate(toDateInputValue(data.projectPlan.timelineStart));
          setNewEndDate(toDateInputValue(data.projectPlan.timelineEnd));
        }
      },
    }
  );

  const { data: historyData, isLoading: historyLoading } = useQuery(
    ['status-history', projectId],
    () => projectTrackingApi.getStatusHistory(projectId!).then((r) => r.data.data as ProjectStatusUpdate[]),
    { enabled: !!projectId }
  );

  const mutation = useMutation(
    (data: { status: string; comment: string; newStartDate?: string; newEndDate?: string }) =>
      projectTrackingApi.submitStatusUpdate(projectId!, data),
    {
      onSuccess: () => {
        setSubmitted(true);
        setTimeout(() => navigate('/active-projects'), 2500);
      },
      onError: (err: any) => {
        setError(err?.response?.data?.message || 'Failed to submit update. Please try again.');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) { setError('Please select a status.'); return; }
    if (!comment.trim()) { setError('Please add a comment describing the current progress.'); return; }
    setError('');
    mutation.mutate({
      status: selectedStatus,
      comment: comment.trim(),
      ...(newStartDate ? { newStartDate } : {}),
      ...(newEndDate ? { newEndDate } : {}),
    });
  };

  const selectedOption = STATUS_OPTIONS.find((o) => o.value === selectedStatus);

  if (projectLoading) return <AppLayout><LoadingSpinner size="lg" className="min-h-[60vh]" /></AppLayout>;

  if (submitted) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Update Submitted</h2>
          <p className="text-gray-500 text-sm">
            {selectedOption?.isTerminal
              ? 'Project marked as complete. Cyber Security has been notified to validate closure.'
              : 'Your status update has been recorded and Cyber Security has been notified.'}
          </p>
          <p className="text-gray-400 text-xs mt-4">Redirecting…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/active-projects')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Active Projects
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Submit Status Update</h1>
          </div>
          {project && (
            <p className="text-gray-500 text-sm ml-12 truncate">{project.improvementTitle}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Current Project Status <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStatus === opt.value
                      ? opt.isUrgent
                        ? 'border-red-400 bg-red-50'
                        : opt.isTerminal
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={selectedStatus === opt.value}
                    onChange={() => setSelectedStatus(opt.value)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                      {opt.isUrgent && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                      {opt.isTerminal && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Triggers closure
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Urgent warning */}
          {selectedOption?.isUrgent && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Selecting this status will send an <strong>urgent notification</strong> to Cyber Security, asking them to contact your team immediately.
              </p>
            </div>
          )}

          {selectedOption?.isTerminal && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Marking as <strong>Project Complete</strong> will move this project to the completed section and notify Cyber Security to validate the closure.
              </p>
            </div>
          )}

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
              Progress Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the current state of the project, any blockers, progress made this period, or next steps…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{comment.length} characters</p>
          </div>

          {/* Amend project dates */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-gray-700">
                Amend Project Dates <span className="text-xs font-normal text-gray-400">(optional)</span>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-start-date" className="block text-xs font-medium text-gray-600 mb-1.5">
                  Start Date
                </label>
                <input
                  id="new-start-date"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="new-end-date" className="block text-xs font-medium text-gray-600 mb-1.5">
                  End Date
                </label>
                <input
                  id="new-end-date"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/active-projects')}
              className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isLoading || !selectedStatus || !comment.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isLoading ? 'Submitting…' : 'Submit Update'}
            </button>
          </div>
        </form>

        {/* History */}
        {!historyLoading && historyData && historyData.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Update History ({historyData.length})
            </h2>
            <div className="space-y-3">
              {historyData.map((update) => (
                <div
                  key={update.id}
                  className={`rounded-lg p-3 border ${update.isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      update.isUrgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {TRACKING_STATUS_LABELS[update.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(update.submittedAt), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{update.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {update.submittedBy ? `${update.submittedBy.firstName} ${update.submittedBy.lastName}` : 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StatusUpdatePage;

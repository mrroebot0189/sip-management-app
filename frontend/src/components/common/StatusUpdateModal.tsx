import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { AlertCircle, AlertTriangle, Calendar, CheckCircle, ClipboardList } from 'lucide-react';
import { projectTrackingApi } from '../../services/api';
import { ActiveProject, ProjectTrackingStatus } from '../../types';

const toDateInputValue = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

interface StatusOption {
  value: ProjectTrackingStatus;
  label: string;
  description: string;
  isUrgent?: boolean;
  isTerminal?: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'started',
    label: 'Started',
    description: 'Project has begun',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    selectedBg: 'bg-blue-600',
    selectedBorder: 'border-blue-600',
    selectedText: 'text-white',
  },
  {
    value: 'on_track',
    label: 'On Track',
    description: 'Progress is as planned',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    selectedBg: 'bg-green-600',
    selectedBorder: 'border-green-600',
    selectedText: 'text-white',
  },
  {
    value: 'not_started',
    label: 'Not Started',
    description: 'Project has not yet started',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    selectedBg: 'bg-gray-600',
    selectedBorder: 'border-gray-600',
    selectedText: 'text-white',
  },
  {
    value: 'in_planning',
    label: 'In Planning',
    description: 'Still in planning or preparation phase',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    selectedBg: 'bg-indigo-600',
    selectedBorder: 'border-indigo-600',
    selectedText: 'text-white',
  },
  {
    value: 'delayed',
    label: 'Delayed',
    description: 'Behind schedule but still progressing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    selectedBg: 'bg-orange-500',
    selectedBorder: 'border-orange-500',
    selectedText: 'text-white',
  },
  {
    value: 'on_hold',
    label: 'On Hold',
    description: 'Temporarily paused',
    isUrgent: true,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    selectedBg: 'bg-red-600',
    selectedBorder: 'border-red-600',
    selectedText: 'text-white',
  },
  {
    value: 'blocked',
    label: 'Blocked',
    description: 'Unable to proceed – external blocker',
    isUrgent: true,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    selectedBg: 'bg-red-600',
    selectedBorder: 'border-red-600',
    selectedText: 'text-white',
  },
  {
    value: 'escalation_needed',
    label: 'Escalation Needed',
    description: 'Requires management intervention',
    isUrgent: true,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    selectedBg: 'bg-red-600',
    selectedBorder: 'border-red-600',
    selectedText: 'text-white',
  },
  {
    value: 'project_complete',
    label: 'Project Complete',
    description: 'Work is complete – request closure validation',
    isTerminal: true,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    selectedBg: 'bg-emerald-600',
    selectedBorder: 'border-emerald-600',
    selectedText: 'text-white',
  },
];

interface Props {
  project: ActiveProject;
  onClose: () => void;
  onSuccess: (projectId: string, status: ProjectTrackingStatus, comment: string) => void;
}

const StatusUpdateModal: React.FC<Props> = ({ project, onClose, onSuccess }) => {
  const [selectedStatus, setSelectedStatus] = useState<ProjectTrackingStatus | ''>('');
  const [comment, setComment] = useState('');
  const [newStartDate, setNewStartDate] = useState(toDateInputValue(project.projectPlan?.timelineStart));
  const [newEndDate, setNewEndDate] = useState(toDateInputValue(project.projectPlan?.timelineEnd));
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation(
    (data: { status: string; comment: string; newStartDate?: string; newEndDate?: string }) =>
      projectTrackingApi.submitStatusUpdate(project.id, data),
    {
      onSuccess: () => {
        setSubmitted(true);
        setTimeout(() => {
          onSuccess(project.id, selectedStatus as ProjectTrackingStatus, comment);
          onClose();
        }, 1500);
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

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Update Submitted</h3>
        <p className="text-sm text-gray-500">
          {selectedOption?.isTerminal
            ? 'Project marked as complete. Directors and Cyber Security have been notified to validate closure.'
            : selectedOption?.isUrgent
            ? 'Your urgent status update has been recorded and both Directors and Cyber Security have been notified.'
            : 'Your status update has been recorded and shared with Directors and Cyber Security.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 -mt-1 mb-4 truncate">{project.improvementTitle}</p>

        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select New Status <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(opt.value);
                  setError('');
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? `${opt.selectedBg} ${opt.selectedBorder} ${opt.selectedText}`
                    : `${opt.bgColor} ${opt.borderColor} ${opt.color} hover:border-current`
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {opt.isUrgent && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                        Urgent
                      </span>
                    )}
                    {opt.isTerminal && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        Completes project
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    {opt.description}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-white bg-white/20' : 'border-current opacity-40'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedOption?.isUrgent && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            Selecting this status will send an <strong>urgent notification</strong> to both Directors and Cyber Security.
          </p>
        </div>
      )}

      {selectedOption?.isTerminal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            This will move the project to the completed section and notify Directors and Cyber Security to validate closure.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="modal-comment" className="block text-sm font-semibold text-gray-700 mb-1.5">
          Reason / Comment <span className="text-red-500">*</span>
        </label>
        <textarea
          id="modal-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe the current state of the project, any blockers, progress made, or next steps…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{comment.length} characters</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-700">Amend Project Dates <span className="text-xs font-normal text-gray-400">(optional)</span></p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-start-date" className="block text-xs font-medium text-gray-600 mb-1">
              Start Date
            </label>
            <input
              id="modal-start-date"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="modal-end-date" className="block text-xs font-medium text-gray-600 mb-1">
              End Date
            </label>
            <input
              id="modal-end-date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
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
  );
};

export default StatusUpdateModal;

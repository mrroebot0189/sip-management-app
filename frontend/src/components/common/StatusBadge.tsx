import React from 'react';
import { ProgrammeStatus, ProjectStatus, WorkItemStatus, Priority } from '../../types';
import clsx from 'clsx';

type AnyStatus = ProgrammeStatus | ProjectStatus | WorkItemStatus | Priority;

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  at_risk: 'At Risk',
  completed: 'Completed',
  cancelled: 'Cancelled',
  backlog: 'Backlog',
  todo: 'To Do',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const STATUS_CLASSES: Record<string, string> = {
  not_started: 'status-not-started',
  in_progress: 'status-in-progress',
  on_hold: 'status-on-hold',
  at_risk: 'status-at-risk',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
  backlog: 'status-backlog',
  todo: 'status-todo',
  in_review: 'status-in-review',
  done: 'status-done',
  blocked: 'status-blocked',
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  critical: 'priority-critical',
};

interface Props {
  value: AnyStatus;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<Props> = ({ value, size = 'md' }) => {
  return (
    <span
      className={clsx(
        'badge',
        STATUS_CLASSES[value] || 'bg-gray-100 text-gray-700',
        size === 'sm' && 'text-xs'
      )}
    >
      {STATUS_LABELS[value] || value}
    </span>
  );
};

export default StatusBadge;

export type UserRole = 'admin' | 'chief' | 'programme_manager' | 'project_manager' | 'team_member' | 'viewer' | 'cyber' | 'director' | 'director_head_of' | 'project_owner';

export type SipProjectStatus = 'draft' | 'new' | 'approved' | 'rejected' | 'under_review' | 'feasibility_assessment' | 'feasibility_accepted' | 'feasibility_rejected' | 'non_implementing' | 'in_planning' | 'plan_submitted' | 'plan_director_approved' | 'plan_complete' | 'active' | 'project_complete' | 'closed_verified';

export type ProjectTrackingStatus = 'started' | 'on_track' | 'not_started' | 'in_planning' | 'on_hold' | 'delayed' | 'blocked' | 'escalation_needed' | 'project_complete' | 'closed_and_verified';

export type SipPriority = 'p1' | 'p2' | 'p3' | 'p4';

export type ProgrammeStatus = 'not_started' | 'in_progress' | 'on_hold' | 'at_risk' | 'completed' | 'cancelled';

export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'at_risk' | 'completed' | 'cancelled';

export type WorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  jobTitle?: string;
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  chief?: string;
  director?: string;
  projectOwners?: string[];
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SipProject {
  id: string;
  improvementTitle: string;
  projectProblem: string;
  mitigationEffectiveness: string;
  desiredOutcomes: string;
  risk: string;
  priority: SipPriority;
  departmentId: string;
  department?: { id: string; name: string };
  status: SipProjectStatus;
  createdById: string;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
  submittedAt?: string;
  // Stage 2 – approval
  approvedById?: string;
  approvedAt?: string;
  approvedBy?: { id: string; firstName: string; lastName: string };
  feasibilityReviewerId?: string;
  feasibilityReviewerAssignedAt?: string;
  feasibilityReviewer?: { id: string; firstName: string; lastName: string; email: string };
  // Stage 2 – rejection
  rejectedById?: string;
  rejectedAt?: string;
  rejectedBy?: { id: string; firstName: string; lastName: string };
  rejectionReason?: string;
  rejectionReasonDraft?: string;
  // Stage 3 – director feasibility decision
  feasibilityAcceptedById?: string;
  feasibilityAcceptedAt?: string;
  feasibilityRejectedById?: string;
  feasibilityRejectedAt?: string;
  feasibilityRejectionReason?: string;
  // Stage 3 – cyber override
  cyberAcceptedById?: string;
  cyberAcceptedAt?: string;
  cyberReportedById?: string;
  cyberReportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type FeasibilityReviewStatus = 'draft' | 'submitted';
export type FeasibilityReviewConclusion = 'proceed' | 'do_not_proceed';

export interface FeasibilityReview {
  id: string;
  sipProjectId: string;
  reviewerId: string;
  suggestedSolution: string;
  understandProblem: boolean;
  estimatedDuration: string;
  estimatedEffort: string;
  setupCosts: number | null;
  annualOngoingCost: number | null;
  setupResources: number | null;
  annualOngoingResources: number | null;
  additionalResources: number | null;
  potentialRisks: string;
  potentialDependencies: string;
  potentialConstraints: string;
  conclusion?: FeasibilityReviewConclusion;
  status: FeasibilityReviewStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SipProjectWithReview extends SipProject {
  feasibilityReview?: FeasibilityReview | null;
}

export type PlanStatus = 'ready' | 'awaiting_budget_approval' | 'resource_requested' | 'in_planning';
export type ProjectPlanStatus = 'draft' | 'submitted' | 'director_approved' | 'director_rejected' | 'cyber_approved' | 'cyber_rejected';
export type MilestoneStatus = 'pending' | 'completed' | 'overdue';

export interface ProjectMilestone {
  id: string;
  projectPlanId: string;
  sipProjectId: string;
  title: string;
  details?: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPlan {
  id: string;
  sipProjectId: string;
  createdById: string;
  planManager?: { id: string; firstName: string; lastName: string; email: string };
  projectOwner: string;
  budgetAllocated: number | null;
  timelineStart?: string;
  timelineEnd?: string;
  keyDeliverables: string; // JSON string
  scope: string;
  plannedActivities: string;
  planStatus: PlanStatus;
  assignedToEmail?: string;
  status: ProjectPlanStatus;
  submittedAt?: string;
  directorReviewedById?: string;
  directorReviewedAt?: string;
  directorRejectionReason?: string;
  cyberApprovedById?: string;
  cyberApprovedAt?: string;
  cyberReviewedById?: string;
  cyberReviewedAt?: string;
  cyberRejectionReason?: string;
  milestones?: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface SipProjectWithPlan extends SipProject {
  projectPlan?: ProjectPlan | null;
}

export interface ProjectStatusUpdate {
  id: string;
  sipProjectId: string;
  status: ProjectTrackingStatus;
  comment: string;
  submittedById: string;
  submittedBy?: { id: string; firstName: string; lastName: string; email?: string };
  isUrgent: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveProject extends SipProject {
  department?: { id: string; name: string; contactEmail?: string };
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
  projectPlan?: ProjectPlan | null;
  statusUpdates?: ProjectStatusUpdate[];
  activeStartDate?: string;
  startNotificationSentAt?: string;
}

export interface KeyDeliverable {
  title: string;
  details?: string;
  dueDate: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

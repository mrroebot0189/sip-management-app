export enum UserRole {
  ADMIN = 'admin',
  CHIEF = 'chief',
  PROGRAMME_MANAGER = 'programme_manager',
  PROJECT_MANAGER = 'project_manager',
  PROJECT_OWNER = 'project_owner',
  TEAM_MEMBER = 'team_member',
  VIEWER = 'viewer',
  CYBER = 'cyber',
  DIRECTOR = 'director',
  DIRECTOR_HEAD_OF = 'director_head_of',
}

export enum SipProjectStatus {
  DRAFT = 'draft',
  NEW = 'new',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
  FEASIBILITY_ASSESSMENT = 'feasibility_assessment',
  // Stage 3 – feasibility decision statuses
  FEASIBILITY_ACCEPTED = 'feasibility_accepted',
  FEASIBILITY_REJECTED = 'feasibility_rejected',
  NON_IMPLEMENTING = 'non_implementing',
  // Stage 4 – planning statuses
  IN_PLANNING = 'in_planning',
  PLAN_SUBMITTED = 'plan_submitted',
  PLAN_DIRECTOR_APPROVED = 'plan_director_approved',
  PLAN_COMPLETE = 'plan_complete',
  // Stage 5 – active project tracking
  ACTIVE = 'active',
  PROJECT_COMPLETE = 'project_complete',
  CLOSED_VERIFIED = 'closed_verified',
}

export enum ProjectTrackingStatus {
  STARTED = 'started',
  ON_TRACK = 'on_track',
  NOT_STARTED = 'not_started',
  IN_PLANNING = 'in_planning',
  ON_HOLD = 'on_hold',
  DELAYED = 'delayed',
  BLOCKED = 'blocked',
  ESCALATION_NEEDED = 'escalation_needed',
  PROJECT_COMPLETE = 'project_complete',
  CLOSED_AND_VERIFIED = 'closed_and_verified',
}

export enum PlanStatus {
  READY = 'ready',
  AWAITING_BUDGET_APPROVAL = 'awaiting_budget_approval',
  RESOURCE_REQUESTED = 'resource_requested',
  IN_PLANNING = 'in_planning',
}

export enum ProjectPlanStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  DIRECTOR_APPROVED = 'director_approved',
  DIRECTOR_REJECTED = 'director_rejected',
  CYBER_APPROVED = 'cyber_approved',
  CYBER_REJECTED = 'cyber_rejected',
}

export enum SipPriority {
  P1 = 'p1',
  P2 = 'p2',
  P3 = 'p3',
  P4 = 'p4',
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

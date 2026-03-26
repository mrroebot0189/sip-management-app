import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { SipProjectStatus, SipPriority } from '../types';

interface SipProjectAttributes {
  id: string;
  improvementTitle: string;
  projectProblem: string;
  mitigationEffectiveness: string;
  desiredOutcomes: string;
  risk: string;
  priority: SipPriority;
  departmentId: string;
  status: SipProjectStatus;
  createdById: string;
  submittedAt?: Date;
  // Stage 2 – approval
  approvedById?: string;
  approvedAt?: Date;
  feasibilityReviewerId?: string;
  feasibilityReviewerAssignedAt?: Date;
  // Stage 2 – rejection
  rejectedById?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  rejectionReasonDraft?: string | null;
  // Stage 3 – director feasibility decision
  feasibilityAcceptedById?: string;
  feasibilityAcceptedAt?: Date;
  feasibilityRejectedById?: string;
  feasibilityRejectedAt?: Date;
  feasibilityRejectionReason?: string;
  // Stage 3 – cyber override
  cyberAcceptedById?: string;
  cyberAcceptedAt?: Date;
  cyberReportedById?: string;
  cyberReportedAt?: Date;
  // Stage 5 – active tracking
  activeStartDate?: Date;
  startNotificationSentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SipProjectCreationAttributes
  extends Optional<
    SipProjectAttributes,
    | 'id'
    | 'status'
    | 'submittedAt'
    | 'approvedById'
    | 'approvedAt'
    | 'feasibilityReviewerId'
    | 'feasibilityReviewerAssignedAt'
    | 'rejectedById'
    | 'rejectedAt'
    | 'rejectionReason'
    | 'rejectionReasonDraft'
    | 'feasibilityAcceptedById'
    | 'feasibilityAcceptedAt'
    | 'feasibilityRejectedById'
    | 'feasibilityRejectedAt'
    | 'feasibilityRejectionReason'
    | 'cyberAcceptedById'
    | 'cyberAcceptedAt'
    | 'cyberReportedById'
    | 'cyberReportedAt'
    | 'activeStartDate'
    | 'startNotificationSentAt'
  > {}

class SipProject
  extends Model<SipProjectAttributes, SipProjectCreationAttributes>
  implements SipProjectAttributes
{
  public id!: string;
  public improvementTitle!: string;
  public projectProblem!: string;
  public mitigationEffectiveness!: string;
  public desiredOutcomes!: string;
  public risk!: string;
  public priority!: SipPriority;
  public departmentId!: string;
  public status!: SipProjectStatus;
  public createdById!: string;
  public submittedAt?: Date;
  public approvedById?: string;
  public approvedAt?: Date;
  public feasibilityReviewerId?: string;
  public feasibilityReviewerAssignedAt?: Date;
  public rejectedById?: string;
  public rejectedAt?: Date;
  public rejectionReason?: string;
  public rejectionReasonDraft?: string | null;
  // Stage 3 – director feasibility decision
  public feasibilityAcceptedById?: string;
  public feasibilityAcceptedAt?: Date;
  public feasibilityRejectedById?: string;
  public feasibilityRejectedAt?: Date;
  public feasibilityRejectionReason?: string;
  // Stage 3 – cyber override
  public cyberAcceptedById?: string;
  public cyberAcceptedAt?: Date;
  public cyberReportedById?: string;
  public cyberReportedAt?: Date;
  // Stage 5
  public activeStartDate?: Date;
  public startNotificationSentAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SipProject.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    improvementTitle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 255] },
    },
    projectProblem: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    mitigationEffectiveness: {
      type: DataTypes.ENUM('Partially Effective', 'Highly Effective', 'Somewhat Effective'),
      allowNull: false,
    },
    desiredOutcomes: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    risk: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(SipPriority)),
      allowNull: false,
      defaultValue: SipPriority.P2,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SipProjectStatus)),
      allowNull: false,
      defaultValue: SipProjectStatus.DRAFT,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Stage 2 – approval fields
    approvedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feasibilityReviewerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    feasibilityReviewerAssignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Stage 2 – rejection fields
    rejectedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReasonDraft: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Stage 3 – director feasibility decision fields
    feasibilityAcceptedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    feasibilityAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feasibilityRejectedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    feasibilityRejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    feasibilityRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Stage 3 – cyber override fields
    cyberAcceptedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cyberAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cyberReportedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cyberReportedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Stage 5 – active tracking fields
    activeStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startNotificationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'SipProjects',
  }
);

export default SipProject;

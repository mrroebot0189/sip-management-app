import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { PlanStatus, ProjectPlanStatus } from '../types';

interface ProjectPlanAttributes {
  id: string;
  sipProjectId: string;
  createdById: string;
  projectOwner: string;
  budgetAllocated: number | null;
  timelineStart?: Date;
  timelineEnd?: Date;
  keyDeliverables: string; // JSON string: { title: string; dueDate: string }[]
  scope: string;
  plannedActivities: string;
  planStatus: PlanStatus;
  assignedToEmail?: string;
  status: ProjectPlanStatus;
  submittedAt?: Date;
  directorReviewedById?: string;
  directorReviewedAt?: Date;
  directorRejectionReason?: string;
  cyberApprovedById?: string;
  cyberApprovedAt?: Date;
  cyberReviewedById?: string;
  cyberReviewedAt?: Date;
  cyberRejectionReason?: string;
  startDateAmended?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectPlanCreationAttributes
  extends Optional<
    ProjectPlanAttributes,
    | 'id'
    | 'status'
    | 'projectOwner'
    | 'budgetAllocated'
    | 'timelineStart'
    | 'timelineEnd'
    | 'keyDeliverables'
    | 'scope'
    | 'plannedActivities'
    | 'planStatus'
    | 'assignedToEmail'
    | 'submittedAt'
    | 'directorReviewedById'
    | 'directorReviewedAt'
    | 'directorRejectionReason'
    | 'cyberApprovedById'
    | 'cyberApprovedAt'
    | 'cyberReviewedById'
    | 'cyberReviewedAt'
    | 'cyberRejectionReason'
    | 'startDateAmended'
  > {}

class ProjectPlan
  extends Model<ProjectPlanAttributes, ProjectPlanCreationAttributes>
  implements ProjectPlanAttributes
{
  public id!: string;
  public sipProjectId!: string;
  public createdById!: string;
  public projectOwner!: string;
  public budgetAllocated!: number | null;
  public timelineStart?: Date;
  public timelineEnd?: Date;
  public keyDeliverables!: string;
  public scope!: string;
  public plannedActivities!: string;
  public planStatus!: PlanStatus;
  public assignedToEmail?: string;
  public status!: ProjectPlanStatus;
  public submittedAt?: Date;
  public directorReviewedById?: string;
  public directorReviewedAt?: Date;
  public directorRejectionReason?: string;
  public cyberApprovedById?: string;
  public cyberApprovedAt?: Date;
  public cyberReviewedById?: string;
  public cyberReviewedAt?: Date;
  public cyberRejectionReason?: string;
  public startDateAmended?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProjectPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sipProjectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    projectOwner: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    budgetAllocated: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    timelineStart: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    timelineEnd: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    keyDeliverables: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    plannedActivities: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    planStatus: {
      type: DataTypes.ENUM(...Object.values(PlanStatus)),
      allowNull: false,
      defaultValue: PlanStatus.IN_PLANNING,
    },
    assignedToEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ProjectPlanStatus)),
      allowNull: false,
      defaultValue: ProjectPlanStatus.DRAFT,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    directorReviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    directorReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    directorRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cyberApprovedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cyberApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cyberReviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cyberReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cyberRejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDateAmended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'ProjectPlans',
  }
);

export default ProjectPlan;

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type MilestoneStatus = 'pending' | 'completed' | 'overdue';

interface ProjectMilestoneAttributes {
  id: string;
  projectPlanId: string;
  sipProjectId: string;
  title: string;
  details?: string;
  dueDate: Date;
  status: MilestoneStatus;
  completedAt?: Date;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectMilestoneCreationAttributes
  extends Optional<
    ProjectMilestoneAttributes,
    'id' | 'status' | 'completedAt' | 'sortOrder' | 'details'
  > {}

class ProjectMilestone
  extends Model<ProjectMilestoneAttributes, ProjectMilestoneCreationAttributes>
  implements ProjectMilestoneAttributes
{
  public id!: string;
  public projectPlanId!: string;
  public sipProjectId!: string;
  public title!: string;
  public details?: string;
  public dueDate!: Date;
  public status!: MilestoneStatus;
  public completedAt?: Date;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProjectMilestone.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sipProjectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'overdue'),
      allowNull: false,
      defaultValue: 'pending',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'ProjectMilestones',
  }
);

export default ProjectMilestone;

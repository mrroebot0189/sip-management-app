import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { ProjectTrackingStatus } from '../types';

interface ProjectStatusUpdateAttributes {
  id: string;
  sipProjectId: string;
  status: ProjectTrackingStatus;
  comment: string;
  submittedById: string;
  isUrgent: boolean;
  submittedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectStatusUpdateCreationAttributes
  extends Optional<ProjectStatusUpdateAttributes, 'id' | 'isUrgent' | 'submittedAt'> {}

class ProjectStatusUpdate
  extends Model<ProjectStatusUpdateAttributes, ProjectStatusUpdateCreationAttributes>
  implements ProjectStatusUpdateAttributes
{
  public id!: string;
  public sipProjectId!: string;
  public status!: ProjectTrackingStatus;
  public comment!: string;
  public submittedById!: string;
  public isUrgent!: boolean;
  public submittedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProjectStatusUpdate.init(
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
    status: {
      type: DataTypes.ENUM(...Object.values(ProjectTrackingStatus)),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    submittedById: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ProjectStatusUpdates',
  }
);

export default ProjectStatusUpdate;

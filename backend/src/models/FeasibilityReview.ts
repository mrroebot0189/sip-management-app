import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum FeasibilityReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

export enum FeasibilityReviewConclusion {
  PROCEED = 'proceed',
  DO_NOT_PROCEED = 'do_not_proceed',
}

interface FeasibilityReviewAttributes {
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
  conclusion: FeasibilityReviewConclusion | null;
  status: FeasibilityReviewStatus;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FeasibilityReviewCreationAttributes
  extends Optional<
    FeasibilityReviewAttributes,
    | 'id'
    | 'status'
    | 'submittedAt'
    | 'suggestedSolution'
    | 'setupCosts'
    | 'annualOngoingCost'
    | 'setupResources'
    | 'annualOngoingResources'
    | 'additionalResources'
    | 'potentialRisks'
    | 'potentialDependencies'
    | 'potentialConstraints'
    | 'conclusion'
  > {}

class FeasibilityReview
  extends Model<FeasibilityReviewAttributes, FeasibilityReviewCreationAttributes>
  implements FeasibilityReviewAttributes
{
  public id!: string;
  public sipProjectId!: string;
  public reviewerId!: string;
  public suggestedSolution!: string;
  public understandProblem!: boolean;
  public estimatedDuration!: string;
  public estimatedEffort!: string;
  public setupCosts!: number | null;
  public annualOngoingCost!: number | null;
  public setupResources!: number | null;
  public annualOngoingResources!: number | null;
  public additionalResources!: number | null;
  public potentialRisks!: string;
  public potentialDependencies!: string;
  public potentialConstraints!: string;
  public conclusion!: FeasibilityReviewConclusion | null;
  public status!: FeasibilityReviewStatus;
  public submittedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FeasibilityReview.init(
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
    reviewerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    suggestedSolution: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    understandProblem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    estimatedDuration: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    estimatedEffort: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    setupCosts: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    annualOngoingCost: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    setupResources: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    annualOngoingResources: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    additionalResources: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    potentialRisks: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    potentialDependencies: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    potentialConstraints: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    conclusion: {
      type: DataTypes.ENUM(...Object.values(FeasibilityReviewConclusion)),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(FeasibilityReviewStatus)),
      allowNull: false,
      defaultValue: FeasibilityReviewStatus.DRAFT,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'FeasibilityReviews',
  }
);

export default FeasibilityReview;

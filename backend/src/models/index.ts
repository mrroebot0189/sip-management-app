import User from './User';
import Department from './Department';
import SipProject from './SipProject';
import FeasibilityReview from './FeasibilityReview';
import ProjectPlan from './ProjectPlan';
import ProjectMilestone from './ProjectMilestone';
import ProjectStatusUpdate from './ProjectStatusUpdate';

// Associations
SipProject.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(SipProject, { foreignKey: 'departmentId', as: 'sipProjects' });

// User → Department (optional: directors can be linked to their department)
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'users' });

SipProject.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(SipProject, { foreignKey: 'createdById', as: 'sipProjects' });

// Stage 2 associations
SipProject.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });
SipProject.belongsTo(User, { foreignKey: 'rejectedById', as: 'rejectedBy' });
SipProject.belongsTo(User, { foreignKey: 'feasibilityReviewerId', as: 'feasibilityReviewer' });

// Stage 3 – Feasibility Review
SipProject.hasOne(FeasibilityReview, { foreignKey: 'sipProjectId', as: 'feasibilityReview' });
FeasibilityReview.belongsTo(SipProject, { foreignKey: 'sipProjectId', as: 'sipProject' });
FeasibilityReview.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });
User.hasMany(FeasibilityReview, { foreignKey: 'reviewerId', as: 'feasibilityReviews' });

// Stage 4 – Project Planning
SipProject.hasOne(ProjectPlan, { foreignKey: 'sipProjectId', as: 'projectPlan' });
ProjectPlan.belongsTo(SipProject, { foreignKey: 'sipProjectId', as: 'sipProject' });
ProjectPlan.belongsTo(User, { foreignKey: 'createdById', as: 'planManager' });
User.hasMany(ProjectPlan, { foreignKey: 'createdById', as: 'projectPlans' });

ProjectPlan.hasMany(ProjectMilestone, { foreignKey: 'projectPlanId', as: 'milestones' });
ProjectMilestone.belongsTo(ProjectPlan, { foreignKey: 'projectPlanId', as: 'projectPlan' });
ProjectMilestone.belongsTo(SipProject, { foreignKey: 'sipProjectId', as: 'sipProject' });

// Stage 5 – Project Status Updates
SipProject.hasMany(ProjectStatusUpdate, { foreignKey: 'sipProjectId', as: 'statusUpdates' });
ProjectStatusUpdate.belongsTo(SipProject, { foreignKey: 'sipProjectId', as: 'sipProject' });
ProjectStatusUpdate.belongsTo(User, { foreignKey: 'submittedById', as: 'submittedBy' });

export { User, Department, SipProject, FeasibilityReview, ProjectPlan, ProjectMilestone, ProjectStatusUpdate };

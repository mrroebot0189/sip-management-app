import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';

const queryClient = new QueryClient();

// Pages
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import DepartmentsPage from './pages/DepartmentsPage';
import SipProjectsPage from './pages/SipProjectsPage';
import SipProjectFormPage from './pages/SipProjectFormPage';
import DirectorDashboardPage from './pages/DirectorDashboardPage';
import NewProjectsPage from './pages/NewProjectsPage';
import ProjectApprovalPage from './pages/ProjectApprovalPage';
import ProjectRejectionPage from './pages/ProjectRejectionPage';
import FeasibilityReviewsPage from './pages/FeasibilityReviewsPage';
import FeasibilityReviewFormPage from './pages/FeasibilityReviewFormPage';
import FeasibilityDecisionPage from './pages/FeasibilityDecisionPage';
import CyberFeasibilityPage from './pages/CyberFeasibilityPage';
import NonImplementingPage from './pages/NonImplementingPage';
import ProjectPlansListPage from './pages/ProjectPlansListPage';
import ProjectPlanFormPage from './pages/ProjectPlanFormPage';
import DirectorPlanReviewPage from './pages/DirectorPlanReviewPage';
import DirectorPlanReviewListPage from './pages/DirectorPlanReviewListPage';
import CyberPlanReviewPage from './pages/CyberPlanReviewPage';
import ProjectMilestoneTrackerPage from './pages/ProjectMilestoneTrackerPage';
import ActiveProjectsPage from './pages/ActiveProjectsPage';
import DepartmentTrackerPage from './pages/DepartmentTrackerPage';
import StatusUpdatePage from './pages/StatusUpdatePage';
import CompletedProjectsPage from './pages/CompletedProjectsPage';
import ClosedProjectsPage from './pages/ClosedProjectsPage';
import DraftsPage from './pages/DraftsPage';
import DirectorFeasibilityReviewListPage from './pages/DirectorFeasibilityReviewListPage';
import CyberDashboardPage from './pages/CyberDashboardPage';
import CyberActiveProjectsPage from './pages/CyberActiveProjectsPage';
import DirectorUnifiedDashboardPage from './pages/DirectorUnifiedDashboardPage';
import CyberUnifiedDashboardPage from './pages/CyberUnifiedDashboardPage';
import DashboardProjectListPage from './pages/DashboardProjectListPage';
import CyberSecurityDashboardPage from './pages/CyberSecurityDashboardPage';
import CyberSecurityAllProjectsPage from './pages/CyberSecurityAllProjectsPage';
import ProjectManagerDashboardPage from './pages/ProjectManagerDashboardPage';
import ProjectOwnerDashboardPage from './pages/ProjectOwnerDashboardPage';

// Coming Soon placeholder for future sections
const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">This section is coming soon.</p>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Director/Admin only route
const DirectorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowed = ['admin', 'director', 'programme_manager', 'director_head_of'];
  if (!user || !allowed.includes(user.role)) return <Navigate to="/sip-projects" replace />;
  return <>{children}</>;
};

// Project Owner route
const ProjectOwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowed = ['admin', 'project_owner'];
  if (!user || !allowed.includes(user.role)) return <Navigate to="/sip-projects" replace />;
  return <>{children}</>;
};

// Project Manager only route
const ProjectManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowed = ['admin', 'project_manager'];
  if (!user || !allowed.includes(user.role)) return <Navigate to="/sip-projects" replace />;
  return <>{children}</>;
};

// Route that blocks project managers from creating new SIP projects.
const NonProjectManagerCreateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'project_manager') return <Navigate to="/project-manager/dashboard" replace />;
  return <>{children}</>;
};

// Cyber/Admin only route
const CyberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const allowed = ['admin', 'cyber'];
  if (!user || !allowed.includes(user.role)) return <Navigate to="/sip-projects" replace />;
  return <>{children}</>;
};

// Role-based default redirect
const DefaultRedirect: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'director' || user?.role === 'director_head_of') {
    return <Navigate to="/director/dashboard" replace />;
  }
  if (user?.role === 'cyber') {
    return <Navigate to="/cyber/dashboard" replace />;
  }
  if (user?.role === 'project_manager') {
    return <Navigate to="/project-manager/dashboard" replace />;
  }
  if (user?.role === 'project_owner') {
    return <Navigate to="/project-owner/dashboard" replace />;
  }
  return <Navigate to="/sip-projects" replace />;
};

// Route that blocks director/director_head_of and cyber from accessing operational list pages.
// Directors have dedicated /director/* routes for their workflow. They can access
// individual form pages if they are self-assigned to a project.
// Cyber users have dedicated /cyber/* routes for their workflow.
const NonDirectorListRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const directorOnly = ['director', 'director_head_of'];
  if (user && directorOnly.includes(user.role)) return <Navigate to="/director/dashboard" replace />;
  if (user?.role === 'cyber') return <Navigate to="/cyber/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<DefaultRedirect />} />
    <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
    <Route path="/admin/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
    {/* SIP Projects – Stage 1 */}
    <Route path="/sip-projects" element={<ProtectedRoute><SipProjectsPage /></ProtectedRoute>} />
    <Route path="/sip-projects/new" element={<NonProjectManagerCreateRoute><SipProjectFormPage /></NonProjectManagerCreateRoute>} />
    <Route path="/sip-projects/:id" element={<ProtectedRoute><SipProjectFormPage /></ProtectedRoute>} />
    {/* Drafts */}
    <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
    {/* Director's Dashboard — department-scoped */}
    <Route path="/director/dashboard" element={<DirectorRoute><DirectorUnifiedDashboardPage /></DirectorRoute>} />
    <Route path="/director/dashboard/projects/:filter" element={<DirectorRoute><DashboardProjectListPage /></DirectorRoute>} />
    {/* Project Owner Dashboard */}
    <Route path="/project-owner/dashboard" element={<ProjectOwnerRoute><ProjectOwnerDashboardPage /></ProjectOwnerRoute>} />
    {/* Project Manager Dashboard — department-scoped */}
    <Route path="/project-manager/dashboard" element={<ProjectManagerRoute><ProjectManagerDashboardPage /></ProjectManagerRoute>} />
    <Route path="/project-manager/dashboard/projects/:filter" element={<ProjectManagerRoute><DashboardProjectListPage /></ProjectManagerRoute>} />
    {/* Cyber Dashboard — all departments */}
    <Route path="/cyber/dashboard/projects/:filter" element={<CyberRoute><DashboardProjectListPage /></CyberRoute>} />
    {/* Stage 2 – Project Approval */}
    <Route path="/director/new-projects" element={<DirectorRoute><NewProjectsPage /></DirectorRoute>} />
    <Route path="/director/projects/:id/approve" element={<DirectorRoute><ProjectApprovalPage /></DirectorRoute>} />
    <Route path="/director/projects/:id/reject" element={<DirectorRoute><ProjectRejectionPage /></DirectorRoute>} />
    {/* Stage 3 – Feasibility Reviews (assigned reviewer) */}
    {/* List page: directors are redirected to their dashboard; form page remains accessible if self-assigned */}
    <Route path="/feasibility-reviews" element={<NonDirectorListRoute><FeasibilityReviewsPage /></NonDirectorListRoute>} />
    <Route path="/feasibility-reviews/:projectId" element={<ProtectedRoute><FeasibilityReviewFormPage /></ProtectedRoute>} />
    {/* Stage 3 – Director feasibility review list */}
    <Route path="/director/feasibility-reviews" element={<DirectorRoute><DirectorFeasibilityReviewListPage /></DirectorRoute>} />
    {/* Stage 3 – Director feasibility decision */}
    <Route path="/director/feasibility/:projectId/review" element={<DirectorRoute><FeasibilityDecisionPage /></DirectorRoute>} />
    {/* Cyber Dashboard — all departments */}
    <Route path="/cyber/dashboard" element={<CyberRoute><CyberUnifiedDashboardPage /></CyberRoute>} />
    {/* Cyber Security Dashboard — per-department overview */}
    <Route path="/cyber/security-dashboard" element={<CyberRoute><CyberSecurityDashboardPage /></CyberRoute>} />
    <Route path="/cyber/security-dashboard/projects/:filter" element={<CyberRoute><DashboardProjectListPage /></CyberRoute>} />
    <Route path="/cyber/security-dashboard/all-projects" element={<CyberRoute><CyberSecurityAllProjectsPage /></CyberRoute>} />
    {/* Cyber – my submitted projects (active pipeline) */}
    <Route path="/cyber/active-projects" element={<CyberRoute><CyberActiveProjectsPage /></CyberRoute>} />
    {/* Stage 3 – Cyber Security feasibility override & non-implementing */}
    <Route path="/cyber/feasibility-reviews" element={<CyberRoute><CyberFeasibilityPage /></CyberRoute>} />
    <Route path="/cyber/non-implementing" element={<CyberRoute><NonImplementingPage /></CyberRoute>} />
    {/* Stage 4 – Project Planning */}
    {/* List page: directors are redirected to their dashboard; form page remains accessible if self-assigned */}
    <Route path="/project-plans" element={<NonDirectorListRoute><ProjectPlansListPage /></NonDirectorListRoute>} />
    <Route path="/project-plans/:projectId" element={<ProtectedRoute><ProjectPlanFormPage /></ProtectedRoute>} />
    {/* Director plan review */}
    <Route path="/director/plan-review/list" element={<DirectorRoute><DirectorPlanReviewListPage /></DirectorRoute>} />
    <Route path="/director/plan-review/:projectId" element={<DirectorRoute><DirectorPlanReviewPage /></DirectorRoute>} />
    {/* Cyber plan review */}
    <Route path="/cyber/plan-review" element={<CyberRoute><CyberPlanReviewPage /></CyberRoute>} />
    {/* Stage 5 – Active project tracking */}
    <Route path="/active-projects" element={<NonDirectorListRoute><ActiveProjectsPage /></NonDirectorListRoute>} />
    <Route path="/active-projects/:projectId/status-update" element={<ProtectedRoute><StatusUpdatePage /></ProtectedRoute>} />
    <Route path="/active-projects/:projectId/tracker" element={<ProtectedRoute><ProjectMilestoneTrackerPage /></ProtectedRoute>} />
    <Route path="/department-tracker/:deptId" element={<ProtectedRoute><DepartmentTrackerPage /></ProtectedRoute>} />
    <Route path="/closed-projects" element={<NonDirectorListRoute><ClosedProjectsPage /></NonDirectorListRoute>} />
    {/* Cyber – closure validation */}
    <Route path="/cyber/completed-projects" element={<CyberRoute><CompletedProjectsPage /></CyberRoute>} />
    <Route path="*" element={<DefaultRedirect />} />
  </Routes>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

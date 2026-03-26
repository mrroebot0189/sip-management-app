import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request (check both stores)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally - clear both stores and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  adminSignup: (email: string, password: string) =>
    api.post('/auth/admin-signup', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// --- Dashboard ---
export const dashboardApi = {
  getCyberStats: () => api.get('/dashboard/cyber-stats'),
  getProjectOwnerStats: () => api.get('/dashboard/project-owner-stats'),
  getUnifiedStats: () => api.get('/dashboard/unified-stats'),
  getDirectorUnifiedStats: () => api.get('/dashboard/director-unified-stats'),
  getProjectManagerStats: () => api.get('/dashboard/project-manager-stats'),
  getDepartmentOverview: () => api.get('/dashboard/department-overview'),
  getMonthlyProjectGrowth: () => api.get('/dashboard/monthly-project-growth'),
};

// --- Users ---
export const usersApi = {
  getAll: () => api.get('/users'),
  getForReview: () => api.get('/users/for-review'),
  getForDepartments: () => api.get('/users/for-departments'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// --- Departments ---
export const departmentsApi = {
  getAll: () => api.get('/departments'),
  create: (data: { name: string; chief?: string; director?: string; projectOwners?: string[]; contactEmail?: string }) =>
    api.post('/departments', data),
  update: (id: string, data: { name: string; chief?: string; director?: string; projectOwners?: string[]; contactEmail?: string }) =>
    api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

// --- SIP Projects ---
export const sipProjectsApi = {
  getAll: () => api.get('/sip-projects'),
  getDrafts: () => api.get('/sip-projects/drafts'),
  getMySubmitted: () => api.get('/sip-projects/my-submitted'),
  getNew: () => api.get('/sip-projects/new'),
  getRejected: () => api.get('/sip-projects/rejected'),
  getById: (id: string) => api.get(`/sip-projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/sip-projects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/sip-projects/${id}`, data),
  submit: (id: string) => api.post(`/sip-projects/${id}/submit`),
  deleteDraft: (id: string) => api.delete(`/sip-projects/${id}`),
  deleteProject: (id: string) => api.delete(`/sip-projects/${id}`),
  withdrawProject: (id: string) => api.delete(`/sip-projects/${id}`),
  // Stage 2 – approval workflow
  approve: (id: string, feasibilityReviewerId: string) =>
    api.post(`/sip-projects/${id}/approve`, { feasibilityReviewerId }),
  reject: (id: string, rejectionReason: string) =>
    api.post(`/sip-projects/${id}/reject`, { rejectionReason }),
  saveRejectionDraft: (id: string, rejectionReasonDraft: string) =>
    api.put(`/sip-projects/${id}/save-rejection`, { rejectionReasonDraft }),
};

// --- Feasibility Reviews ---
export const feasibilityReviewsApi = {
  getAll: () => api.get('/feasibility-reviews'),
  getSubmitted: () => api.get('/feasibility-reviews/submitted'),
  getCyberReview: () => api.get('/feasibility-reviews/cyber-review'),
  getNonImplementing: () => api.get('/feasibility-reviews/non-implementing'),
  getByProjectId: (projectId: string) => api.get(`/feasibility-reviews/${projectId}`),
  save: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/feasibility-reviews/${projectId}/save`, data),
  submit: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/feasibility-reviews/${projectId}/submit`, data),
  // Stage 3 – feasibility decisions
  directorAccept: (projectId: string) =>
    api.post(`/feasibility-reviews/${projectId}/director-accept`),
  directorReject: (projectId: string, rejectionReason: string) =>
    api.post(`/feasibility-reviews/${projectId}/director-reject`, { rejectionReason }),
  cyberAccept: (projectId: string) =>
    api.post(`/feasibility-reviews/${projectId}/cyber-accept`),
  cyberReport: (projectId: string) =>
    api.post(`/feasibility-reviews/${projectId}/cyber-report`),
  cyberBulkAccept: (projectIds: string[]) =>
    api.post('/feasibility-reviews/bulk-cyber-accept', { projectIds }),
  cyberBulkReport: (projectIds: string[]) =>
    api.post('/feasibility-reviews/bulk-cyber-report', { projectIds }),
  cyberAssign: (projectId: string, feasibilityReviewerId: string) =>
    api.post(`/feasibility-reviews/${projectId}/cyber-assign`, { feasibilityReviewerId }),
  returnToFeasibility: (projectId: string) =>
    api.post(`/feasibility-reviews/${projectId}/return-to-feasibility`),
};

// --- Project Plans ---
export const projectPlansApi = {
  getAll: () => api.get('/project-plans'),
  getForDirectorReview: () => api.get('/project-plans/for-director-review'),
  getForCyberReview: () => api.get('/project-plans/for-cyber-review'),
  getMilestones: (projectId: string) => api.get(`/project-plans/milestones/${projectId}`),
  toggleMilestone: (milestoneId: string) => api.put(`/project-plans/milestones/${milestoneId}/toggle`),
  getByProjectId: (projectId: string) => api.get(`/project-plans/${projectId}`),
  save: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/project-plans/${projectId}/save`, data),
  submit: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/project-plans/${projectId}/submit`, data),
  assign: (projectId: string, assignToEmail: string) =>
    api.post(`/project-plans/${projectId}/assign`, { assignToEmail }),
  contactCyber: (projectId: string) => api.post(`/project-plans/${projectId}/contact-cyber`),
  directorApprove: (projectId: string) =>
    api.post(`/project-plans/${projectId}/director-approve`),
  directorReject: (projectId: string, rejectionReason: string) =>
    api.post(`/project-plans/${projectId}/director-reject`, { rejectionReason }),
  cyberApprove: (projectId: string) => api.post(`/project-plans/${projectId}/cyber-approve`),
  cyberReject: (projectId: string, rejectionReason: string) =>
    api.post(`/project-plans/${projectId}/cyber-reject`, { rejectionReason }),
};

// --- Project Tracking (Stage 5) ---
export const projectTrackingApi = {
  getActive: () => api.get('/project-tracking/active'),
  getCompleted: () => api.get('/project-tracking/completed'),
  getClosed: () => api.get('/project-tracking/closed'),
  getDepartmentTracker: (deptId: string) => api.get(`/project-tracking/department/${deptId}`),
  getStatusHistory: (projectId: string) => api.get(`/project-tracking/${projectId}/status-history`),
  submitStatusUpdate: (projectId: string, data: { status: string; comment: string; newStartDate?: string; newEndDate?: string }) =>
    api.post(`/project-tracking/${projectId}/status-update`, data),
  verifyClosure: (projectId: string) =>
    api.post(`/project-tracking/${projectId}/verify-closure`),
  activateProject: (projectId: string) =>
    api.post(`/project-tracking/${projectId}/activate`),
  getProjectById: (projectId: string) =>
    api.get(`/project-tracking/${projectId}`),
};

export default api;

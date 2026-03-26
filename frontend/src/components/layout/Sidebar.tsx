import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Briefcase,
  Settings,
  ChevronUp,
  Building2,
  ShieldAlert,
  ClipboardList,
  Inbox,
  ClipboardCheck,
  FolderOpen,
  FolderKanban,
  ShieldCheck,
  FileBarChart2,
  Archive,
  CheckCircle,
  FileEdit,
  Zap,
  BarChart2,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { sipProjectsApi, projectPlansApi, projectTrackingApi, feasibilityReviewsApi } from '../../services/api';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const [newProjectCount, setNewProjectCount] = useState<number | null>(null);
  const [planReviewCount, setPlanReviewCount] = useState<number | null>(null);
  const [feasibilityReviewCount, setFeasibilityReviewCount] = useState<number | null>(null);
  const [completedProjectCount, setCompletedProjectCount] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [feasibilityAssessmentCount, setFeasibilityAssessmentCount] = useState<number | null>(null);
  const [planningCount, setPlanningCount] = useState<number | null>(null);
  const [activeProjectCount, setActiveProjectCount] = useState<number | null>(null);
  const [closedProjectCount, setClosedProjectCount] = useState<number | null>(null);
  const [cyberFeasibilityCount, setCyberFeasibilityCount] = useState<number | null>(null);
  const [planApprovalsCount, setPlanApprovalsCount] = useState<number | null>(null);
  const [nonImplementingCount, setNonImplementingCount] = useState<number | null>(null);
  const [mySubmittedCount, setMySubmittedCount] = useState<number | null>(null);

  const isProjectOwner = user?.role === 'project_owner';

  const isDirectorOrAbove =
    user?.role === 'admin' || user?.role === 'director' || user?.role === 'programme_manager' || user?.role === 'director_head_of';

  // Director-only roles (not programme_manager) – have restricted access to operational sections
  const isDirectorOnly = user?.role === 'director' || user?.role === 'director_head_of';

  const isCyber = user?.role === 'cyber' || user?.role === 'admin';

  // Pure cyber role (not admin) – should only see cyber-specific sections
  const isCyberOnly = user?.role === 'cyber';

  const isProjectManager = user?.role === 'project_manager';

  // Project head section: visible to all authenticated users except pure cyber role
  const isProjectHead = !isCyberOnly;

  useEffect(() => {
    if (!isDirectorOrAbove) return;
    sipProjectsApi
      .getNew()
      .then((res) => setNewProjectCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    projectPlansApi
      .getForDirectorReview()
      .then((res) => setPlanReviewCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    feasibilityReviewsApi
      .getSubmitted()
      .then((res) => setFeasibilityReviewCount((res.data.data || []).length))
      .catch(() => {/* silent */});
  }, [isDirectorOrAbove]);

  useEffect(() => {
    if (!isCyber) return;
    projectTrackingApi
      .getCompleted()
      .then((res) => setCompletedProjectCount((res.data.data || []).length))
      .catch(() => {/* silent */});
  }, [isCyber]);

  useEffect(() => {
    sipProjectsApi
      .getDrafts()
      .then((res) => setDraftCount((res.data.data || []).length))
      .catch(() => {/* silent */});

    // Reviews & Planning counts are not needed for pure cyber role
    if (isCyberOnly) return;

    feasibilityReviewsApi
      .getAll()
      .then((res) => setFeasibilityAssessmentCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    projectPlansApi
      .getAll()
      .then((res) => setPlanningCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    projectTrackingApi
      .getActive()
      .then((res) => setActiveProjectCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    projectTrackingApi
      .getClosed()
      .then((res) => setClosedProjectCount((res.data.data || []).length))
      .catch(() => {/* silent */});
  }, [isCyberOnly]);

  useEffect(() => {
    if (!isCyber) return;
    feasibilityReviewsApi
      .getCyberReview()
      .then((res) => setCyberFeasibilityCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    projectPlansApi
      .getForCyberReview()
      .then((res) => setPlanApprovalsCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    feasibilityReviewsApi
      .getNonImplementing()
      .then((res) => setNonImplementingCount((res.data.data || []).length))
      .catch(() => {/* silent */});
    sipProjectsApi
      .getMySubmitted()
      .then((res) => setMySubmittedCount((res.data.data || []).length))
      .catch(() => {/* silent */});
  }, [isCyber]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    );

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    );

  return (
    <aside className="w-64 bg-gray-900 flex flex-col min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Security</p>
          <p className="text-gray-400 text-xs mt-0.5">Improvement Programme</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Dashboard — for directors, cyber, project managers, and project owners */}
        {(isDirectorOrAbove || isCyberOnly || isProjectManager || isProjectOwner) && (
          <NavLink
            to={
              isDirectorOrAbove
                ? '/director/dashboard'
                : isProjectManager
                ? '/project-manager/dashboard'
                : isProjectOwner
                ? '/project-owner/dashboard'
                : '/cyber/dashboard'
            }
            className={navLinkClass}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {isDirectorOrAbove ? 'Directors' : 'Dashboard'}
          </NavLink>
        )}

        {/* New Projects – directors only */}
        {isDirectorOrAbove && (
          <NavLink to="/director/new-projects" className={navLinkClass}>
            <Inbox className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">New Projects</span>
            {newProjectCount !== null && newProjectCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {newProjectCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Project Head section – ordered to match the main system workflow */}
        {/* For directors: only show if they have work assigned to them; always show for other roles */}
        {isProjectHead && (!isDirectorOnly || (feasibilityAssessmentCount ?? 0) > 0 || (planningCount ?? 0) > 0) && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reviews &amp; Planning</p>
            </div>
            {/* Feasibility Assessment: always visible to non-directors; for directors only when assigned */}
            {(!isDirectorOnly || (feasibilityAssessmentCount !== null && feasibilityAssessmentCount > 0)) && (
              <NavLink to="/feasibility-reviews" className={navLinkClass}>
                <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">Feasibility Assessment</span>
                {feasibilityAssessmentCount !== null && feasibilityAssessmentCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {feasibilityAssessmentCount}
                  </span>
                )}
              </NavLink>
            )}
          </>
        )}

        {/* Feasibility reviews – only for directors */}
        {isDirectorOrAbove && (
          <NavLink to="/director/feasibility-reviews" className={navLinkClass}>
            <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Feasibility Reviews</span>
            {feasibilityReviewCount !== null && feasibilityReviewCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {feasibilityReviewCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Planning – appears after feasibility stages */}
        {isProjectHead && (!isDirectorOnly || (planningCount !== null && planningCount > 0)) && (
          <NavLink to="/project-plans" className={navLinkClass}>
            <FolderOpen className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Planning</span>
            {planningCount !== null && planningCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {planningCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Director plan review – only for directors */}
        {isDirectorOrAbove && (
          <NavLink to="/director/plan-review/list" className={navLinkClass}>
            <FolderOpen className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">Plan Reviews</span>
            {planReviewCount !== null && planReviewCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {planReviewCount}
              </span>
            )}
          </NavLink>
        )}

        {/* Active & Closed Projects: hidden from directors – they use director dashboard for oversight */}
        {isProjectHead && !isDirectorOnly && (
          <>
            <NavLink to="/active-projects" className={navLinkClass}>
              <Zap className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Active Projects</span>
              {activeProjectCount !== null && activeProjectCount > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {activeProjectCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/closed-projects" className={navLinkClass}>
              <Archive className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Closed Projects</span>
              {closedProjectCount !== null && closedProjectCount > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {closedProjectCount}
                </span>
              )}
            </NavLink>
          </>
        )}

        {/* Cyber Security section */}
        {isCyber && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cyber Security</p>
            </div>
            <NavLink to="/cyber/security-dashboard" className={navLinkClass}>
              <BarChart2 className="w-5 h-5 flex-shrink-0" />
              Security Dashboard
            </NavLink>
            <NavLink to="/sip-projects" className={navLinkClass}>
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              Projects
            </NavLink>
            <NavLink to="/drafts" className={navLinkClass}>
              <FileEdit className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Drafts</span>
              {draftCount !== null && draftCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {draftCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/cyber/active-projects" className={navLinkClass}>
              <FolderKanban className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Active Projects</span>
              {mySubmittedCount !== null && mySubmittedCount > 0 && (
                <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {mySubmittedCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/cyber/feasibility-reviews" className={navLinkClass}>
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Feasibility Decisions</span>
              {cyberFeasibilityCount !== null && cyberFeasibilityCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {cyberFeasibilityCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/cyber/plan-review" className={navLinkClass}>
              <FolderOpen className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Plan Approvals</span>
              {planApprovalsCount !== null && planApprovalsCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {planApprovalsCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/cyber/non-implementing" className={navLinkClass}>
              <FileBarChart2 className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Non-Implementing</span>
              {nonImplementingCount !== null && nonImplementingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {nonImplementingCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/cyber/completed-projects" className={navLinkClass}>
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">Validate Closures</span>
              {completedProjectCount !== null && completedProjectCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {completedProjectCount}
                </span>
              )}
            </NavLink>
          </>
        )}

        {/* Admin section - only for admins */}
        {isAdmin && (
          <div>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                adminOpen
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Admin</span>
              <ChevronUp
                className={clsx(
                  'w-4 h-4 transition-transform',
                  adminOpen ? 'rotate-0' : 'rotate-180'
                )}
              />
            </button>
            {adminOpen && (
              <div className="ml-3 mt-1 space-y-1">
                <NavLink to="/admin/users" className={subNavLinkClass}>
                  <Users className="w-4 h-4 flex-shrink-0" />
                  Users
                </NavLink>
                <NavLink to="/admin/departments" className={subNavLinkClass}>
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  Departments
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-700 px-3 py-4">
        {/* User section */}
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-gray-400 text-xs truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

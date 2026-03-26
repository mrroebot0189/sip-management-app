import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, AlertCircle, ClipboardCheck, Clock, CheckCircle2, FileSearch, XCircle, Activity, AlertTriangle, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import { sipProjectsApi, feasibilityReviewsApi, projectTrackingApi, projectPlansApi } from '../services/api';
import { SipProject, SipPriority, SipProjectWithReview, ActiveProject, SipProjectWithPlan } from '../types';

const PRIORITY_COLOURS: Record<SipPriority, string> = {
  p1: 'bg-red-100 text-red-700',
  p2: 'bg-orange-100 text-orange-700',
  p3: 'bg-yellow-100 text-yellow-700',
  p4: 'bg-green-100 text-green-700',
};

const PRIORITY_LABELS: Record<SipPriority, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const PIE_COLOURS = ['#3b82f6', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444'];

const TRACKING_STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  started:           { label: 'Started',           colour: 'bg-blue-100 text-blue-700' },
  on_track:          { label: 'On Track',           colour: 'bg-green-100 text-green-700' },
  not_started:       { label: 'Not Started',        colour: 'bg-gray-100 text-gray-600' },
  in_planning:       { label: 'In Planning',        colour: 'bg-indigo-100 text-indigo-700' },
  on_hold:           { label: 'On Hold',            colour: 'bg-yellow-100 text-yellow-700' },
  delayed:           { label: 'Delayed',            colour: 'bg-orange-100 text-orange-700' },
  blocked:           { label: 'Blocked',            colour: 'bg-red-100 text-red-700' },
  escalation_needed: { label: 'Escalation Needed',  colour: 'bg-red-200 text-red-800' },
  project_complete:  { label: 'Complete',           colour: 'bg-teal-100 text-teal-700' },
};

const DirectorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProject[]>([]);
  const [rejectedProjects, setRejectedProjects] = useState<SipProject[]>([]);
  const [reviewProjects, setReviewProjects] = useState<SipProjectWithReview[]>([]);
  const [submittedReviews, setSubmittedReviews] = useState<SipProjectWithReview[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [planningReviews, setPlanningReviews] = useState<SipProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectedLoading, setRejectedLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [submittedLoading, setSubmittedLoading] = useState(true);
  const [activeLoading, setActiveLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    sipProjectsApi
      .getNew()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load new SIP projects.'))
      .finally(() => setLoading(false));

    sipProjectsApi
      .getRejected()
      .then((res) => setRejectedProjects(res.data.data || []))
      .catch(() => {/* silent – not critical */})
      .finally(() => setRejectedLoading(false));

    feasibilityReviewsApi
      .getAll()
      .then((res) => {
        const all: SipProjectWithReview[] = res.data.data || [];
        // In-progress = not yet submitted
        setReviewProjects(all.filter((p) => p.feasibilityReview?.status !== 'submitted'));
      })
      .catch(() => setReviewError('Failed to load feasibility reviews.'))
      .finally(() => setReviewLoading(false));

    feasibilityReviewsApi
      .getSubmitted()
      .then((res) => setSubmittedReviews(res.data.data || []))
      .catch(() => {/* silent – not critical */})
      .finally(() => setSubmittedLoading(false));

    projectTrackingApi
      .getActive()
      .then((res) => setActiveProjects(res.data.data || []))
      .catch(() => {/* silent – not critical */})
      .finally(() => setActiveLoading(false));

    projectPlansApi
      .getForDirectorReview()
      .then((res) => setPlanningReviews(res.data.data || []))
      .catch(() => {/* silent – not critical */})
      .finally(() => setPlanningLoading(false));
  }, []);

  return (
    <AppLayout title="Director's Dashboard">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Director's Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              New Security Improvement Programme projects requiring your attention
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">New Projects</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '…' : projects.length}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">Awaiting Decision</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{submittedLoading ? '…' : submittedReviews.length}</p>
            <p className="text-xs text-gray-400 mt-1">Feasibility reviews to decide</p>
          </div>
          <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">Active Projects</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">{activeLoading ? '…' : activeProjects.length}</p>
            <p className="text-xs text-gray-400 mt-1">Currently in execution</p>
          </div>
          <div className="bg-white border border-teal-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 font-medium">Plans to Approve</p>
            <p className="text-3xl font-bold text-teal-600 mt-1">{planningLoading ? '…' : planningReviews.length}</p>
            <p className="text-xs text-gray-400 mt-1">Planning plans awaiting sign-off</p>
          </div>
        </div>

        {/* Pipeline Distribution */}
        {(() => {
          const isLoadingAny = loading || reviewLoading || submittedLoading || activeLoading || rejectedLoading || planningLoading;
          const pieData = [
            { name: 'New', value: projects.length },
            { name: 'In Feasibility', value: reviewProjects.length + submittedReviews.length },
            { name: 'In Planning', value: planningReviews.length },
            { name: 'Active', value: activeProjects.length },
            { name: 'Rejected', value: rejectedProjects.length },
          ].filter((d) => d.value > 0);
          return (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
              <p className="text-sm font-semibold text-gray-600 mb-1">Pipeline Distribution</p>
              <p className="text-xs text-gray-400 mb-4">Projects across all pipeline stages</p>
              <div className="h-48">
                {isLoadingAny || pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                    {isLoadingAny ? 'Loading…' : 'No pipeline data'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius="40%"
                        outerRadius="65%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })()}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* New projects table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800 text-sm">New SIP Projects</h2>
            {!loading && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {projects.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-14">
              <ShieldAlert className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No new SIP projects at this time.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted By</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Date Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                          title="New"
                        />
                        {p.improvementTitle}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[p.priority]}`}
                      >
                        {PRIORITY_LABELS[p.priority]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.createdBy
                        ? `${p.createdBy.firstName} ${p.createdBy.lastName}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.submittedAt
                        ? new Date(p.submittedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/sip-projects/${p.id}`)}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Feasibility Reviews – Awaiting Director Decision */}
        <div className="bg-white border border-green-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Feasibility Reviews – Awaiting Your Decision</h2>
            {!submittedLoading && (
              <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {submittedReviews.length}
              </span>
            )}
          </div>

          {submittedLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
            </div>
          ) : submittedReviews.length === 0 ? (
            <div className="text-center py-10">
              <FileSearch className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No submitted feasibility reviews awaiting your decision.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Reviewer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submittedReviews.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {p.improvementTitle}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.feasibilityReviewer
                        ? `${p.feasibilityReviewer.firstName} ${p.feasibilityReviewer.lastName}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.feasibilityReview?.submittedAt
                        ? new Date(p.feasibilityReview.submittedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/director/feasibility/${p.id}/review`)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Review &amp; Decide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Feasibility Decisions – Director Rejections */}
        <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Feasibility Decisions – Director Rejections</h2>
            {!rejectedLoading && (
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {rejectedProjects.length}
              </span>
            )}
          </div>

          {rejectedLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-600" />
            </div>
          ) : rejectedProjects.length === 0 ? (
            <div className="text-center py-10">
              <XCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No rejected projects.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted By</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Rejected By</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Rejected On</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rejectedProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        {p.improvementTitle}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {p.rejectedBy ? `${p.rejectedBy.firstName} ${p.rejectedBy.lastName}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.rejectedAt ? new Date(p.rejectedAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/sip-projects/${p.id}`)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Feasibility Reviews – In Progress */}
        {reviewError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {reviewError}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Feasibility Reviews – In Progress</h2>
            {!reviewLoading && (
              <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {reviewProjects.length}
              </span>
            )}
          </div>

          {reviewLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
            </div>
          ) : reviewProjects.length === 0 ? (
            <div className="text-center py-14">
              <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No projects currently under feasibility review.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Reviewer</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Assigned</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Review Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewProjects.map((p) => {
                  const reviewStatus = p.feasibilityReview?.status ?? null;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          {p.improvementTitle}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {p.feasibilityReviewer
                          ? `${p.feasibilityReviewer.firstName} ${p.feasibilityReviewer.lastName}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {p.feasibilityReviewerAssignedAt
                          ? new Date(p.feasibilityReviewerAssignedAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            reviewStatus === 'draft'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {reviewStatus === 'draft' ? 'In Progress' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => navigate(`/feasibility-reviews/${p.id}`)}
                          className="text-indigo-600 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Planning – Awaiting Director Approval */}
        <div className="bg-white border border-teal-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-teal-100 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-teal-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Project Plans – Awaiting Your Approval</h2>
            {!planningLoading && (
              <span className="ml-auto bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {planningReviews.length}
              </span>
            )}
          </div>

          {planningLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600" />
            </div>
          ) : planningReviews.length === 0 ? (
            <div className="text-center py-10">
              <CalendarClock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No project plans awaiting your approval.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Plan Manager</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planningReviews.map((p) => {
                  const plan = p.projectPlan;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          {p.improvementTitle}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[p.priority]}`}>
                          {PRIORITY_LABELS[p.priority]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {plan?.planManager
                          ? `${plan.planManager.firstName} ${plan.planManager.lastName}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {plan?.submittedAt
                          ? new Date(plan.submittedAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => navigate(`/director/plan-review/${p.id}`)}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Review &amp; Decide
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Active Projects */}
        <div className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Active Projects</h2>
            {!activeLoading && (
              <span className="ml-auto bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {activeProjects.length}
              </span>
            )}
          </div>

          {activeLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="text-center py-14">
              <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No projects are currently active.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Latest Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">End Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeProjects.map((p) => {
                  const latestUpdate = p.statusUpdates?.[0];
                  const statusInfo = latestUpdate
                    ? (TRACKING_STATUS_LABELS[latestUpdate.status] ?? { label: latestUpdate.status, colour: 'bg-gray-100 text-gray-600' })
                    : null;
                  const endDate = (p.projectPlan as any)?.timelineEnd;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                        <div className="flex items-center gap-2">
                          {latestUpdate?.isUrgent ? (
                            <span title="Urgent"><AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /></span>
                          ) : (
                            <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          )}
                          {p.improvementTitle}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[p.priority]}`}>
                          {PRIORITY_LABELS[p.priority]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {statusInfo ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.colour}`}>
                            {statusInfo.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">No update</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {endDate ? new Date(endDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => navigate(`/active-projects/${p.id}/tracker`)}
                          className="text-purple-600 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DirectorDashboardPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, ShieldAlert, AlertCircle } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { sipProjectsApi } from '../services/api';
import { SipProject, SipPriority } from '../types';

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

const NewProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SipProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    sipProjectsApi
      .getNew()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load new SIP projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="New Projects">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Projects</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              These projects have been submitted by Cybersecurity and require your review to confirm there is a control weakness that should undertake a feasibility assessment.
            </p>
          </div>
          {!loading && (
            <span className="ml-auto bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
              {projects.length} awaiting review
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800 text-sm">New SIP Projects</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-14">
              <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No new projects awaiting your decision.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Project Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Submitted By</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Date Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/director/projects/${p.id}/approve`)}
                  >
                    <td className="px-5 py-3 font-medium text-blue-700 hover:underline max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default NewProjectsPage;

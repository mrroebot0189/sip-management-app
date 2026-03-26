import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Plus, Clock, CheckCircle, Filter, Trash2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { sipProjectsApi } from '../services/api';
import { SipProject, SipPriority } from '../types';
import { useAuth } from '../contexts/AuthContext';

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

const PRIORITIES: SipPriority[] = ['p1', 'p2', 'p3', 'p4'];

const SipProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canCreateProject = user?.role !== 'project_manager';
  const [projects, setProjects] = useState<SipProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Set<SipPriority>>(new Set());

  useEffect(() => {
    sipProjectsApi
      .getAll()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  const togglePriorityFilter = (priority: SipPriority) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });
  };

  const filteredProjects =
    priorityFilter.size === 0 ? projects : projects.filter((p) => priorityFilter.has(p.priority));

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await sipProjectsApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout title="SIP Projects">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SIP Projects</h1>
              <p className="text-gray-500 text-sm mt-0.5">Security Improvement Programme – your projects</p>
            </div>
          </div>
          {canCreateProject && (
            <button
              onClick={() => navigate('/sip-projects/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log New Project
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Priority filter */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <Filter className="w-4 h-4" />
            Filter by priority:
          </span>
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              onClick={() => togglePriorityFilter(priority)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                priorityFilter.has(priority)
                  ? `${PRIORITY_COLOURS[priority]} border-current`
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
            >
              {PRIORITY_LABELS[priority]}
            </button>
          ))}
          {priorityFilter.size > 0 && (
            <button
              onClick={() => setPriorityFilter(new Set())}
              className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No SIP projects yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {canCreateProject
                ? 'Click "Log New Project" to get started.'
                : 'Projects will appear here once they are assigned.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">No projects match the selected priority filter.</p>
                <button
                  onClick={() => setPriorityFilter(new Set())}
                  className="mt-2 text-blue-600 text-sm hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                        <span className="truncate">{p.improvementTitle}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.department?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[p.priority]}`}
                        >
                          {PRIORITY_LABELS[p.priority]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {p.status === 'draft' ? (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3.5 h-3.5" /> Draft
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> New
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/sip-projects/${p.id}`)}
                            className="text-blue-600 hover:underline text-xs font-medium"
                          >
                            {p.status === 'draft' ? 'Edit' : 'View'}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(p.id, p.improvementTitle)}
                              disabled={deletingId === p.id}
                              className="text-red-500 hover:text-red-700 disabled:opacity-40"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SipProjectsPage;

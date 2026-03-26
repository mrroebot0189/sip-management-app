import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileEdit,
  Plus,
  Clock,
  Trash2,
  AlertCircle,
  CheckSquare,
  Square,
  Send,
  Filter,
} from 'lucide-react';
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

const PRIORITIES: SipPriority[] = ['p1', 'p2', 'p3', 'p4'];

const DraftsPage: React.FC = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<SipProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Set<SipPriority>>(new Set());

  const fetchDrafts = () => {
    setLoading(true);
    sipProjectsApi
      .getDrafts()
      .then((res) => setDrafts(res.data.data || []))
      .catch(() => setError('Failed to load drafts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const togglePriorityFilter = (priority: SipPriority) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });
  };

  const filteredDrafts =
    priorityFilter.size === 0 ? drafts : drafts.filter((d) => priorityFilter.has(d.priority));

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Individual delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await sipProjectsApi.deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setError('Failed to delete draft.');
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (
      !window.confirm(
        `Delete ${count} selected draft${count !== 1 ? 's' : ''}? This cannot be undone.`
      )
    )
      return;

    setBulkLoading(true);
    setError('');
    try {
      await Promise.all(Array.from(selectedIds).map((id) => sipProjectsApi.deleteDraft(id)));
      setDrafts((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch {
      setError('Failed to delete one or more drafts.');
      fetchDrafts();
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk submit
  const handleBulkSubmit = async () => {
    const count = selectedIds.size;
    if (
      !window.confirm(
        `Submit ${count} selected draft${count !== 1 ? 's' : ''} for review? This will notify the relevant departments.`
      )
    )
      return;

    setBulkLoading(true);
    setError('');
    try {
      await Promise.all(Array.from(selectedIds).map((id) => sipProjectsApi.submit(id)));
      setDrafts((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch {
      setError('Failed to submit one or more drafts.');
      fetchDrafts();
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AppLayout title="Drafts">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Draft Projects</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Projects saved as drafts — not yet submitted for review
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/sip-projects/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <FileEdit className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No draft projects</p>
            <p className="text-gray-400 text-sm mt-1">
              When you save a project as a draft it will appear here.
            </p>
            <button
              onClick={() => navigate('/sip-projects/new')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log New Project
            </button>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                You have <strong>{drafts.length}</strong> draft{drafts.length !== 1 ? 's' : ''}{' '}
                waiting to be submitted.
              </span>
            </div>

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

            {/* Bulk action bar — shown when 1+ projects selected */}
            {selectedIds.size >= 1 && (
              <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="text-blue-800 text-sm font-medium flex-1">
                  {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={handleBulkSubmit}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Submit
                </button>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Title</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Department</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Priority</th>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">Last Saved</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDrafts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                        No drafts match the selected priority filter.
                      </td>
                    </tr>
                  )}
                  {filteredDrafts.map((draft) => {
                    const isSelected = selectedIds.has(draft.id);
                    return (
                      <tr
                        key={draft.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSelect(draft.id)}
                              className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="flex items-center gap-2 min-w-0">
                              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span className="truncate">
                                {draft.improvementTitle || (
                                  <em className="text-gray-400">Untitled draft</em>
                                )}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{draft.department?.name ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[draft.priority]}`}
                          >
                            {PRIORITY_LABELS[draft.priority]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {new Date(draft.updatedAt).toLocaleDateString('en-GB')}{' '}
                          <span className="text-gray-400">
                            {new Date(draft.updatedAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/sip-projects/${draft.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                            >
                              Continue editing
                            </button>
                            <button
                              onClick={() => handleDelete(draft.id)}
                              disabled={deletingId === draft.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DraftsPage;

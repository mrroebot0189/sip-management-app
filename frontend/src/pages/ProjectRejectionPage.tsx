import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, XCircle, AlertCircle, Save, CheckCircle } from 'lucide-react';
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

const ProjectRejectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<SipProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!id) return;
    sipProjectsApi
      .getById(id)
      .then((res) => {
        const p: SipProject = res.data.data;
        setProject(p);
        // Pre-fill with any saved draft
        if (p.rejectionReasonDraft) setReason(p.rejectionReasonDraft);
      })
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setFormError('');
    try {
      await sipProjectsApi.saveRejectionDraft(id!, reason);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setFormError('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setFormError('A rejection reason is required before submitting.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await sipProjectsApi.reject(id!, reason.trim());
      navigate('/director/new-projects', {
        state: { successMessage: 'Project rejected. The cyber team has been notified.' },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit rejection.';
      setFormError(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Reject Project">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout title="Reject Project">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error || 'Project not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (project.status !== 'new') {
    return (
      <AppLayout title="Reject Project">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            This project has already been actioned and can no longer be rejected.
          </div>
          <button
            onClick={() => navigate(`/director/projects/${id}/approve`)}
            className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reject Project">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate(`/director/projects/${id}/approve`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Details
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reject Project</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Please provide the reason for rejecting this project
            </p>
          </div>
        </div>

        {/* Project summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm">
          <p className="font-semibold text-gray-800 mb-1">{project.improvementTitle}</p>
          <div className="flex items-center gap-3 flex-wrap text-gray-500">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOURS[project.priority]}`}
            >
              {PRIORITY_LABELS[project.priority]}
            </span>
            <span>{project.department?.name ?? '—'}</span>
            <span>
              {project.createdBy
                ? `Submitted by ${project.createdBy.firstName} ${project.createdBy.lastName}`
                : ''}
            </span>
          </div>
        </div>

        {/* Rejection form */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Reason for Rejection</h2>
          </div>
          <div className="p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={8}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setFormError(''); }}
              placeholder="Please provide a clear explanation as to why this project will not proceed…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              This reason will be sent to the Cyber Security team by email.
            </p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {formError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Draft saved successfully.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={submitting || saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                Submitting…
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Submit Rejection
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || submitting}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-500" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProjectRejectionPage;

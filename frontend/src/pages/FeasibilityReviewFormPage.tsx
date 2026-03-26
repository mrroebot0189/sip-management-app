import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Save,
  Send,
  CheckCircle2,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import SaveSuccessToast from '../components/common/SaveSuccessToast';
import { feasibilityReviewsApi } from '../services/api';
import { SipProjectWithReview } from '../types';

interface ReviewForm {
  suggestedSolution: string;
  setupCosts: string;
  annualOngoingCost: string;
  setupResources: string;
  annualOngoingResources: string;
  conclusion: string;
}

const emptyForm: ReviewForm = {
  suggestedSolution: '',
  setupCosts: '',
  annualOngoingCost: '',
  setupResources: '',
  annualOngoingResources: '',
  conclusion: '',
};

const numericFieldToString = (val: number | null | undefined): string =>
  val != null ? String(val) : '';


const sanitizeNumericInput = (value: string): string =>
  value
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');

const FeasibilityReviewFormPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectData, setProjectData] = useState<SipProjectWithReview | null>(null);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!projectId) return;
    feasibilityReviewsApi
      .getByProjectId(projectId)
      .then((res) => {
        const data: SipProjectWithReview = res.data.data;
        setProjectData(data);
        if (data.feasibilityReview) {
          const r = data.feasibilityReview;
          setForm({
            suggestedSolution: r.suggestedSolution,
            setupCosts: numericFieldToString(r.setupCosts),
            annualOngoingCost: numericFieldToString(r.annualOngoingCost),
            setupResources: numericFieldToString(r.setupResources),
            annualOngoingResources: numericFieldToString(r.annualOngoingResources),
            conclusion: r.conclusion ?? '',
          });
        }
      })
      .catch(() => setError('Failed to load project details.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const isSubmitted = projectData?.feasibilityReview?.status === 'submitted';

  const handleSave = async () => {
    setSaving(true);
    setActionError('');
    setSaveSuccess(false);
    try {
      await feasibilityReviewsApi.save(projectId!, {
        ...form,
      });
      // Reload project data so draft status is reflected
      const res = await feasibilityReviewsApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
      setSaveSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save review.';
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.suggestedSolution.trim()) {
      setActionError('Please enter the suggested solution.');
      return;
    }
    if (!form.conclusion) {
      setActionError('Please select a conclusion.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      await feasibilityReviewsApi.submit(projectId!, {
        ...form,
      });
      setSubmitSuccess(true);
      // Reload to show submitted state
      const res = await feasibilityReviewsApi.getByProjectId(projectId!);
      setProjectData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit review.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const textareaClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500';
  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';

  if (loading) {
    return (
      <AppLayout title="Feasibility Assessment">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !projectData) {
    return (
      <AppLayout title="Feasibility Assessment">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error || 'Project not found.'}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Feasibility Assessment">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/feasibility-reviews')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feasibility Reviews
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{projectData.improvementTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {projectData.department?.name ?? '—'} · Feasibility Assessment
          </p>
        </div>

        {/* Submitted banner */}
        {isSubmitted && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            This feasibility review has been submitted. The director has been notified.
          </div>
        )}

        {/* Success banner – submit */}
        {submitSuccess && !isSubmitted && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Review submitted successfully. The director has been notified.
          </div>
        )}

        {/* Project summary */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Project Summary</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 w-44 align-top">Problem / Weakness</td>
                <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.projectProblem}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-gray-500 bg-gray-50 align-top">Desired Outcomes</td>
                <td className="px-5 py-3 text-gray-900 whitespace-pre-wrap">{projectData.desiredOutcomes}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Review form */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Feasibility Assessment</h2>
          </div>
          <div className="p-5 space-y-5">

            {/* Suggested solution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Suggested solution <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={form.suggestedSolution}
                onChange={(e) => setForm({ ...form, suggestedSolution: e.target.value })}
                disabled={isSubmitted}
                placeholder="At a high level, how would you fix or address this problem?..."
                className={textareaClass}
              />
            </div>
          </div>
        </div>

        {/* Resources section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Resources</h2>
            <p className="text-xs text-gray-500 mt-0.5">Expressed in person days</p>
          </div>
          <div className="p-5 space-y-5">

            {/* Implementation resource */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Implementation resource (person days)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.setupResources}
                onChange={(e) => setForm({ ...form, setupResources: sanitizeNumericInput(e.target.value) })}
                disabled={isSubmitted}
                placeholder="e.g. 30"
                className={inputClass}
              />
            </div>

            {/* Annual resource */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Annual resource (person days)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.annualOngoingResources}
                onChange={(e) => setForm({ ...form, annualOngoingResources: sanitizeNumericInput(e.target.value) })}
                disabled={isSubmitted}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Costs section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Costs</h2>
          </div>
          <div className="p-5 space-y-5">

            {/* Implementation cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Implementation cost (£)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.setupCosts}
                onChange={(e) => setForm({ ...form, setupCosts: sanitizeNumericInput(e.target.value) })}
                disabled={isSubmitted}
                placeholder="e.g. 50000"
                className={inputClass}
              />
            </div>

            {/* Annual cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Annual cost (£)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.annualOngoingCost}
                onChange={(e) => setForm({ ...form, annualOngoingCost: sanitizeNumericInput(e.target.value) })}
                disabled={isSubmitted}
                placeholder="e.g. 10000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Conclusion section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Conclusion</h2>
          </div>
          <div className="p-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project manager conclusion <span className="text-red-500">*</span>
              </label>
              <select
                value={form.conclusion}
                onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
                disabled={isSubmitted}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select a conclusion…</option>
                <option value="proceed">Proceed – benefits outweigh costs</option>
                <option value="do_not_proceed">Do not proceed – costs outweigh benefits</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Save success */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Draft saved successfully.
          </div>
        )}

        {/* Action buttons */}
        {!isSubmitted && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || submitting}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-600" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Draft
                </>
              )}
            </button>

            <button
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for Director Approval
                </>
              )}
            </button>

          </div>
        )}
      </div>

      <SaveSuccessToast
        show={saveSuccess}
        message="Your feasibility review has been saved successfully."
        onClose={() => setSaveSuccess(false)}
      />
    </AppLayout>
  );
};

export default FeasibilityReviewFormPage;

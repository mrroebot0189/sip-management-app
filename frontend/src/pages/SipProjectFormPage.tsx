import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ShieldAlert, Save, Send, ChevronLeft, CheckCircle, FileEdit, Trash2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import SaveSuccessToast from '../components/common/SaveSuccessToast';
import { departmentsApi, sipProjectsApi } from '../services/api';
import { Department, SipProject, SipPriority } from '../types';

const PRIORITY_OPTIONS: { value: SipPriority; label: string; colour: string; description: string }[] = [
  { value: 'p1', label: 'P1', colour: 'bg-red-100 text-red-800', description: 'Critical' },
  { value: 'p2', label: 'P2', colour: 'bg-orange-100 text-orange-800', description: 'High' },
  { value: 'p3', label: 'P3', colour: 'bg-yellow-100 text-yellow-800', description: 'Medium' },
  { value: 'p4', label: 'P4', colour: 'bg-green-100 text-green-800', description: 'Low' },
];

const FIELD_LABELS: Record<string, string> = {
  improvementTitle: 'Improvement Title',
  projectProblem: 'Project Problem / Weakness',
  mitigationEffectiveness: 'Mitigation Effectiveness',
  desiredOutcomes: 'Desired Outcomes',
  risk: 'Risk Rating',
  priority: 'Priority',
  departmentId: 'Department Assigned To',
};

const MITIGATION_EFFECTIVENESS_OPTIONS = [
  'Partially Effective',
  'Highly Effective',
  'Somewhat Effective',
] as const;

const RISK_OPTIONS = ['Critical', 'Significant', 'Moderate', 'Low'] as const;

interface FormState {
  improvementTitle: string;
  projectProblem: string;
  mitigationEffectiveness: string;
  desiredOutcomes: string;
  risk: string;
  priority: SipPriority | '';
  departmentId: string;
}

const EMPTY_FORM: FormState = {
  improvementTitle: '',
  projectProblem: '',
  mitigationEffectiveness: '',
  desiredOutcomes: '',
  risk: '',
  priority: '',
  departmentId: '',
};

const PRIORITY_LABELS: Record<SipPriority, string> = {
  p1: 'P1 – Critical',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
};

const calculatePriority = (risk: string, mitigationEffectiveness: string): SipPriority | '' => {
  if (!risk) return '';
  if (risk === 'Critical' && mitigationEffectiveness === 'Highly Effective') return 'p1';
  if (risk === 'Significant') return 'p2';
  if (risk === 'Moderate' && mitigationEffectiveness === 'Partially Effective') return 'p4';
  if (risk === 'Moderate') return 'p3';
  if (risk === 'Low') return 'p4';
  return 'p2';
};

const SipProjectFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingProject, setLoadingProject] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(id || null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  useEffect(() => {
    const nextPriority = calculatePriority(form.risk, form.mitigationEffectiveness);
    if (nextPriority !== form.priority) {
      setForm((prev) => ({ ...prev, priority: nextPriority }));
    }
  }, [form.risk, form.mitigationEffectiveness, form.priority]);

  // Load departments
  useEffect(() => {
    departmentsApi
      .getAll()
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setErrorMsg('Failed to load departments.'))
      .finally(() => setLoadingDepts(false));
  }, []);

  // Load existing project if editing
  useEffect(() => {
    if (!id) return;
    sipProjectsApi
      .getById(id)
      .then((res) => {
        const p: SipProject = res.data.data;
        setForm({
          improvementTitle: p.improvementTitle,
          projectProblem: p.projectProblem,
          mitigationEffectiveness: p.mitigationEffectiveness,
          desiredOutcomes: p.desiredOutcomes,
          risk: p.risk,
          priority: p.priority,
          departmentId: p.departmentId,
        });
        if (p.status !== 'draft') setSubmitted(true);
      })
      .catch(() => setErrorMsg('Failed to load project.'))
      .finally(() => setLoadingProject(false));
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const validate = (): boolean => {
    for (const key of Object.keys(EMPTY_FORM) as (keyof FormState)[]) {
      if (key === 'priority') continue;
      if (!form[key]?.trim()) {
        setErrorMsg(`${FIELD_LABELS[key]} is required.`);
        return false;
      }
    }

    if (!form.priority) {
      setErrorMsg('Priority could not be calculated. Please review Risk Rating and Mitigation Effectiveness.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let res;
      if (savedId) {
        res = await sipProjectsApi.update(savedId, form as unknown as Record<string, unknown>);
      } else {
        res = await sipProjectsApi.create(form as unknown as Record<string, unknown>);
        setSavedId(res.data.data.id);
        navigate(`/sip-projects/${res.data.data.id}`, { replace: true });
      }
      setSuccessMsg(res.data.message || 'Draft saved successfully.');
      setShowSaveToast(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save draft.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Save first if needed, then submit
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let projectId = savedId;
      if (!projectId) {
        const createRes = await sipProjectsApi.create(form as unknown as Record<string, unknown>);
        projectId = createRes.data.data.id;
        setSavedId(projectId);
      } else {
        await sipProjectsApi.update(projectId, form as unknown as Record<string, unknown>);
      }

      const submitRes = await sipProjectsApi.submit(projectId!);
      setSuccessMsg(submitRes.data.message || 'Project submitted successfully.');
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit project.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!savedId) return;
    if (!window.confirm('Delete this draft project? This cannot be undone.')) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await sipProjectsApi.deleteDraft(savedId);
      navigate('/sip-projects');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete draft.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProject) {
    return (
      <AppLayout title={isEditing ? 'Edit SIP Project' : 'Log New SIP Project'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? 'Edit SIP Project' : 'Log New SIP Project'}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/sip-projects')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to SIP Projects
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit SIP Project' : 'Log New SIP Project'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Stage 1 – Cyber Security: Log a security improvement project
              </p>
            </div>
          </div>
        </div>

        {/* Submitted banner */}
        {submitted && (
          <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Project submitted</p>
              <p className="text-green-700 text-sm mt-0.5">
                This project has been submitted and the assigned department has been notified. Its
                status is now <strong>New</strong> and it will appear on the Director's dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Feedback messages */}
        {successMsg && !submitted && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center justify-between gap-4">
            <span>{successMsg}</span>
            <Link
              to="/drafts"
              className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900 underline whitespace-nowrap"
            >
              <FileEdit className="w-3.5 h-3.5" />
              View all drafts
            </Link>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Form table */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {/* Improvement Title */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.improvementTitle}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <input
                    name="improvementTitle"
                    value={form.improvementTitle}
                    onChange={handleChange}
                    disabled={submitted}
                    placeholder="e.g. Patch Management Process Improvement"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </td>
              </tr>

              {/* Project Problem */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.projectProblem}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <textarea
                    name="projectProblem"
                    value={form.projectProblem}
                    onChange={handleChange}
                    disabled={submitted}
                    rows={4}
                    placeholder="Describe the security problem or weakness identified..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-y"
                  />
                </td>
              </tr>

              {/* Risk Rating */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.risk}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <select
                    name="risk"
                    value={form.risk}
                    onChange={handleChange}
                    disabled={submitted}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
                  >
                    <option value="">— Select risk rating —</option>
                    {RISK_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              {/* Desired Outcomes */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.desiredOutcomes}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <textarea
                    name="desiredOutcomes"
                    value={form.desiredOutcomes}
                    onChange={handleChange}
                    disabled={submitted}
                    rows={4}
                    placeholder="What outcomes are expected once this improvement is implemented..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-y"
                  />
                </td>
              </tr>

              {/* Mitigation Effectiveness */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.mitigationEffectiveness}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <select
                    name="mitigationEffectiveness"
                    value={form.mitigationEffectiveness}
                    onChange={handleChange}
                    disabled={submitted}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
                  >
                    <option value="">— Select mitigation effectiveness —</option>
                    {MITIGATION_EFFECTIVENESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              {/* Priority */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.priority}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
                    {form.priority ? (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            PRIORITY_OPTIONS.find((opt) => opt.value === form.priority)?.colour
                          }`}
                        >
                          {form.priority.toUpperCase()}
                        </span>
                        <span className="text-sm text-blue-900 font-medium">
                          {PRIORITY_LABELS[form.priority]}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-blue-900 font-medium">
                        Select Risk Rating and Mitigation Effectiveness to calculate priority.
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Priority is automatically calculated from Risk Rating and Mitigation Effectiveness.
                  </p>
                </td>
              </tr>

              {/* Department */}
              <tr>
                <th className="w-44 px-5 py-4 text-left text-sm font-semibold text-gray-700 bg-gray-50 align-top">
                  {FIELD_LABELS.departmentId}
                  <span className="text-red-500 ml-0.5">*</span>
                </th>
                <td className="px-5 py-4">
                  {loadingDepts ? (
                    <div className="h-9 w-full bg-gray-100 animate-pulse rounded-lg" />
                  ) : (
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      disabled={submitted}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
                    >
                      <option value="">— Select a department —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                          {d.director ? ` (Director: ${d.director})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {departments.length === 0 && !loadingDepts && (
                    <p className="mt-1 text-xs text-amber-600">
                      No departments configured. Ask an administrator to add departments first.
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        {!submitted && (
          <div className="mt-6 flex items-center justify-end gap-3">
            {savedId && (
              <button
                onClick={handleDelete}
                disabled={saving || submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-200 bg-white text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all mr-auto"
              >
                <Trash2 className="w-4 h-4" />
                Delete Draft
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting…' : 'Submit for Director Approval'}
            </button>
          </div>
        )}

        {/* Help text */}
        {!submitted && (
          <p className="mt-3 text-xs text-gray-400 text-right">
            <strong>Save</strong> stores a draft. <strong>Submit for Director Approval</strong> sets status to{' '}
            <em>New</em> and emails the department director.
          </p>
        )}
      </div>

      <SaveSuccessToast
        show={showSaveToast}
        message="Your draft has been saved successfully."
        onClose={() => setShowSaveToast(false)}
      />
    </AppLayout>
  );
};

export default SipProjectFormPage;

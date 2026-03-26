import React, { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2, User } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { departmentsApi, usersApi } from '../services/api';
import { Department, User as UserType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DeptForm {
  name: string;
  chief: string;
  director: string;
  projectOwners: string[];
}

const emptyForm: DeptForm = { name: '', chief: '', director: '', projectOwners: [] };

type FieldErrors = Partial<Record<keyof DeptForm, string>>;

function MultiOwnerSelect({
  projectOwners,
  selected,
  onChange,
  error,
}: {
  projectOwners: UserType[];
  selected: string[];
  onChange: (val: string[]) => void;
  error?: string;
}) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div>
      <label className="label">Project Owners * <span className="text-xs font-normal text-gray-400">(select one or more)</span></label>
      {projectOwners.length === 0 ? (
        <p className="text-xs text-gray-400 mt-1">No users with the Project Owner role found.</p>
      ) : (
        <div className={`border rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto${error ? ' border-red-500' : ' border-gray-200'}`}>
          {projectOwners.map((u) => {
            const name = `${u.firstName} ${u.lastName}`;
            const checked = selected.includes(name);
            return (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={checked}
                  onChange={() => toggle(name)}
                />
                <span className="text-sm text-gray-700">{name}</span>
              </label>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const DepartmentsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const chiefs = users.filter((u) => u.role === 'chief');
  const directors = users.filter((u) => u.role === 'director' || u.role === 'director_head_of');
  const projectOwners = users.filter((u) => u.role === 'project_owner');

  const isAdmin = currentUser?.role === 'admin';

  const fetchDepartments = async () => {
    try {
      const [deptsResult, usersResult] = await Promise.allSettled([
        departmentsApi.getAll(),
        usersApi.getForDepartments(),
      ]);
      if (deptsResult.status === 'fulfilled') {
        setDepartments(deptsResult.value.data.data ?? []);
      } else {
        console.error('Failed to load departments:', deptsResult.reason);
      }
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value.data.data ?? []);
      } else {
        console.error('Failed to load users:', usersResult.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const validateForm = (f: DeptForm): FieldErrors => {
    const errors: FieldErrors = {};
    if (!f.name.trim()) errors.name = 'Department name is required';
    if (!f.chief) errors.chief = 'Chief is required';
    if (!f.director) errors.director = 'Director is required';
    if (f.projectOwners.length === 0) errors.projectOwners = 'At least one Project Owner is required';
    return errors;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      await departmentsApi.create({
        name: form.name,
        chief: form.chief,
        director: form.director,
        projectOwners: form.projectOwners,
      });
      setShowCreate(false);
      setForm(emptyForm);
      fetchDepartments();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create department'
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setForm({
      name: dept.name,
      chief: dept.chief ?? '',
      director: dept.director ?? '',
      projectOwners: dept.projectOwners ?? [],
    });
    setError('');
    setFieldErrors({});
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    setError('');
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      await departmentsApi.update(editDept.id, {
        name: form.name,
        chief: form.chief,
        director: form.director,
        projectOwners: form.projectOwners,
      });
      setEditDept(null);
      setForm(emptyForm);
      fetchDepartments();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update department'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showConfirmDelete) return;
    setDeleting(true);
    try {
      await departmentsApi.delete(showConfirmDelete.id);
      setShowConfirmDelete(null);
      fetchDepartments();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const DeptForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      <div>
        <label className="label">Department Name *</label>
        <input
          className={`input${fieldErrors.name ? ' border-red-500 focus:ring-red-500' : ''}`}
          value={form.name}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((fe) => ({ ...fe, name: undefined })); }}
          placeholder="e.g. Cyber Security"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
      </div>
      <div>
        <label className="label">Chief *</label>
        <select
          className={`input${fieldErrors.chief ? ' border-red-500 focus:ring-red-500' : ''}`}
          value={form.chief}
          onChange={(e) => { setForm((f) => ({ ...f, chief: e.target.value })); setFieldErrors((fe) => ({ ...fe, chief: undefined })); }}
        >
          <option value="">— Select a Chief —</option>
          {chiefs.map((u) => (
            <option key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
        {fieldErrors.chief && <p className="mt-1 text-xs text-red-600">{fieldErrors.chief}</p>}
        {chiefs.length === 0 && <p className="mt-1 text-xs text-gray-400">No users with the Chief role found.</p>}
      </div>
      <div>
        <label className="label">Director *</label>
        <select
          className={`input${fieldErrors.director ? ' border-red-500 focus:ring-red-500' : ''}`}
          value={form.director}
          onChange={(e) => { setForm((f) => ({ ...f, director: e.target.value })); setFieldErrors((fe) => ({ ...fe, director: undefined })); }}
        >
          <option value="">— Select a Director —</option>
          {directors.map((u) => (
            <option key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
        {fieldErrors.director && <p className="mt-1 text-xs text-red-600">{fieldErrors.director}</p>}
        {directors.length === 0 && <p className="mt-1 text-xs text-gray-400">No users with the Director role found.</p>}
      </div>
      <MultiOwnerSelect
        projectOwners={projectOwners}
        selected={form.projectOwners}
        onChange={(val) => { setForm((f) => ({ ...f, projectOwners: val })); setFieldErrors((fe) => ({ ...fe, projectOwners: undefined })); }}
        error={fieldErrors.projectOwners}
      />
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setShowCreate(false); setEditDept(null); setError(''); setFieldErrors({}); setForm(emptyForm); }}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <AppLayout
      title="Departments"
      actions={
        isAdmin ? (
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setError(''); setFieldErrors({}); setShowCreate(true); }}>
            <Plus className="w-4 h-4" /> Add Department
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingSpinner size="lg" className="mt-20" />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10 text-gray-300" />}
          title="No departments yet"
          description={isAdmin ? 'Add your first department using the button above.' : 'No departments have been created yet.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">DEPARTMENT</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">CHIEF</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">DIRECTOR</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">PROJECT OWNERS</th>
                {isAdmin && (
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {dept.chief ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {dept.chief}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {dept.director ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {dept.director}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {dept.projectOwners && dept.projectOwners.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {dept.projectOwners.map((name) => (
                          <div key={name} className="flex items-center gap-1.5 text-sm text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(dept)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit department"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(dept)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setError(''); setFieldErrors({}); setForm(emptyForm); }}
        title="Add Department"
        size="md"
      >
        <DeptForm onSubmit={handleCreate} submitLabel="Create Department" />
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={!!editDept}
        onClose={() => { setEditDept(null); setError(''); setFieldErrors({}); setForm(emptyForm); }}
        title="Edit Department"
        size="md"
      >
        <DeptForm onSubmit={handleEdit} submitLabel="Save Changes" />
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        title="Delete Department"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold text-gray-900">{showConfirmDelete?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowConfirmDelete(null)}>
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Department'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default DepartmentsPage;

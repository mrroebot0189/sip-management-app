import React, { useEffect, useState } from 'react';
import { UserPlus, Mail, Trash2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { usersApi } from '../services/api';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  chief: 'Chief',
  cyber: 'Cybersecurity',
  director_head_of: 'Director/Head Of',
  project_owner: 'Project Owner',
};

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '', lastName: '', email: '',
    role: 'project_owner',
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete modal
  const [showConfirmDelete, setShowConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', email: '', role: '',
    isActive: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const randomValues = new Uint32Array(12);
      window.crypto.getRandomValues(randomValues);
      return Array.from(randomValues, (value) => chars[value % chars.length]).join('');
    }

    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const fetchData = async () => {
    try {
      const usersRes = await usersApi.getAll();
      setUsers(usersRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError('');
    try {
      const payload = {
        ...createForm,
        password: generateTemporaryPassword(),
      };
      await usersApi.create(payload as Record<string, unknown>);
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', role: 'project_owner' });
      fetchData();
    } catch (err: unknown) {
      setCreateError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    });
    setEditError('');
  };

  const handleDelete = async () => {
    if (!showConfirmDelete) return;
    setDeleting(true);
    try {
      await usersApi.delete(showConfirmDelete.id);
      setShowConfirmDelete(null);
      fetchData();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    setEditError('');
    try {
      const payload: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
      };
      await usersApi.update(editUser.id, payload);
      setEditUser(null);
      fetchData();
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <AppLayout
      title="Users"
      actions={
        isAdmin ? (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingSpinner size="lg" className="mt-20" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">USER</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">ROLE</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">STATUS</th>
                {isAdmin && (
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 ${isAdmin ? 'cursor-pointer' : ''}`}
                  onClick={() => isAdmin && openEdit(u)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.isActive ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <span className="text-white text-sm font-semibold">{u.firstName[0]}{u.lastName[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-blue-50 text-blue-700">{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(u); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Deactivate user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateError(''); }} title="Add New User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{createError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name *</label><input className="input" required value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div><label className="label">Last Name *</label><input className="input" required value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div><label className="label">Email Address *</label><input type="email" className="input" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="project_owner">Project Owner</option>
              <option value="chief">Chief</option>
              <option value="cyber">Cybersecurity</option>
              <option value="director_head_of">Director/Head Of</option>
              {isAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowCreate(false); setCreateError(''); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createSaving}>{createSaving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); setEditError(''); }} title="Edit User" size="md">
        <form onSubmit={handleEditUser} className="space-y-4">
          {editError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{editError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name *</label><input className="input" required value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div><label className="label">Last Name *</label><input className="input" required value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div><label className="label">Email Address *</label><input type="email" className="input" required value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="project_owner">Project Owner</option>
              <option value="chief">Chief</option>
              <option value="cyber">Cybersecurity</option>
              <option value="director_head_of">Director/Head Of</option>
              {isAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
          <div>
            <label className="label">Account Status</label>
            <select className="input" value={editForm.isActive ? 'active' : 'inactive'} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setEditUser(null); setEditError(''); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
      {/* Confirm Deactivate Modal */}
      <Modal
        isOpen={!!showConfirmDelete}
        onClose={() => setShowConfirmDelete(null)}
        title="Deactivate User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate{' '}
            <span className="font-semibold text-gray-900">
              {showConfirmDelete?.firstName} {showConfirmDelete?.lastName}
            </span>? They will no longer be able to log in.
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
              {deleting ? 'Deactivating...' : 'Deactivate User'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default UsersPage;

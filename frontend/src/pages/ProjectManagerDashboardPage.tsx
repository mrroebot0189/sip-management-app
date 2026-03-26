import React, { useEffect, useState } from 'react';
import SharedDashboardView, { DashboardStats } from '../components/dashboard/SharedDashboardView';
import { dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ProjectManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    dashboardApi
      .getProjectManagerStats()
      .then((res) => {
        const data = res.data.data;
        setDepartmentName(data.departmentName ?? null);
        setStats(data);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const subtitle = departmentName
    ? `Security Improvement Programme — ${departmentName} department`
    : 'Security Improvement Programme — all departments';

  return (
    <SharedDashboardView
      title={`Welcome back, ${user?.firstName}`}
      subtitle={subtitle}
      stats={stats}
      loading={loading}
      error={error}
      onRefresh={load}
      basePath="/project-manager/dashboard"
    />
  );
};

export default ProjectManagerDashboardPage;

import React, { useEffect, useState } from 'react';
import SharedDashboardView, { DashboardStats } from '../components/dashboard/SharedDashboardView';
import { dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CyberUnifiedDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    dashboardApi
      .getUnifiedStats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <SharedDashboardView
      title={`Welcome back, ${user?.firstName}`}
      subtitle="Security Improvement Programme — all departments"
      stats={stats}
      loading={loading}
      error={error}
      onRefresh={load}
      basePath="/cyber/dashboard"
    />
  );
};

export default CyberUnifiedDashboardPage;

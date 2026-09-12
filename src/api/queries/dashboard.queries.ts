import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { DashboardStats } from '../../types';

// Métricas del taller calculadas por el backend
const fetchDashboard = async (errorMode?: 'inline'): Promise<DashboardStats> => {
  const { data } = await apiClient.get<DashboardStats>('/dashboard', { errorMode });
  return data;
};

export const useDashboardQuery = (errorMode?: 'inline') => {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => fetchDashboard(errorMode),
  });
};

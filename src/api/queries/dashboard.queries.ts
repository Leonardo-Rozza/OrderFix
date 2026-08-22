import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../axios';
import { queryKeys } from '../queryKeys';
import type { DashboardStats } from '../../types';

// Métricas del taller calculadas por el backend
const fetchDashboard = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get<DashboardStats>('/dashboard');
  return data;
};

export const useDashboardQuery = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: fetchDashboard,
  });
};

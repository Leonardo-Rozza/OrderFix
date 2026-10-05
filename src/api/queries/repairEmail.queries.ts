import { useLayoutEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authStore } from '../../store/auth.store';
import {
  captureRepairEmailSession, canRetryRepairEmail, fetchRepairEmailStatus,
  isRepairEmailSessionCurrent, retryRepairEmail,
  type RepairEmailSession, type RepairEmailStatus,
} from '../repairEmail';
import { queryKeys } from '../queryKeys';

type Attempt = { repairId: number; session: RepairEmailSession };

export const useRepairEmailNotification = (repairId: number) => {
  const auth = authStore();
  const session = auth.isAuthenticated ? captureRepairEmailSession() : null;
  const generation = session?.generation ?? null;
  const account = session?.account ?? null;
  const client = useQueryClient();
  const activeScope = useRef<Attempt | null>(null);
  const retryLock = useRef<Attempt | null>(null);
  useLayoutEffect(() => {
    activeScope.current = account !== null && generation !== null
      ? { repairId, session: { account, generation } } : null;
    return () => { activeScope.current = null; };
  }, [repairId, account, generation]);

  const query = useQuery({
    queryKey: queryKeys.repairEmail.detail(repairId, generation),
    queryFn: ({ signal }) => fetchRepairEmailStatus(repairId, session!, signal),
    enabled: session !== null && Number.isSafeInteger(repairId) && repairId > 0,
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
  const isActive = (attempt: Attempt) => activeScope.current?.repairId === attempt.repairId
    && activeScope.current.session.generation === attempt.session.generation
    && activeScope.current.session.account === attempt.session.account
    && isRepairEmailSessionCurrent(attempt.session);
  const mutation = useMutation({
    retry: false,
    mutationFn: (attempt: Attempt) => retryRepairEmail(attempt.repairId, attempt.session),
    onMutate: async (attempt) => {
      const key = queryKeys.repairEmail.detail(attempt.repairId, attempt.session.generation);
      await client.cancelQueries({ queryKey: key, exact: true });
      if (!isActive(attempt)) return;
      // Revoke only cached permission. Never claim an enqueue before the server ACK.
      client.setQueryData<RepairEmailStatus>(key, (current) => (
        current ? { ...current, reintentable: false } : undefined
      ));
    },
    onSuccess: async (status, attempt) => {
      if (!isActive(attempt)) return;
      const key = queryKeys.repairEmail.detail(attempt.repairId, attempt.session.generation);
      // Fence reads started during the POST before publishing its authoritative DTO.
      await client.cancelQueries({ queryKey: key, exact: true });
      if (!isActive(attempt)) return;
      client.setQueryData(key, status);
    },
  });

  const mutationIsCurrent = mutation.variables !== undefined && isActive(mutation.variables);
  const isRetrying = mutation.isPending && mutationIsCurrent;
  // A concurrent invalidation GET can still carry pre-POST permission. Only an
  // explicit refresh may clear this current attempt's uncertain-result barrier.
  const canRetry = session !== null && !query.isFetching && !query.isError
    && !isRetrying && !(mutation.isError && mutationIsCurrent) && canRetryRepairEmail(query.data);
  const retry = async () => {
    if (!canRetry || !session || !captureRepairEmailSession()
      || (retryLock.current && isActive(retryLock.current))) return;
    const attempt = { repairId, session };
    if (!isActive(attempt)) return;
    retryLock.current = attempt;
    try {
      await mutation.mutateAsync(attempt);
    } catch {
      // The card shows a fixed local error; only a fresh GET restores permission.
    } finally { if (retryLock.current === attempt) retryLock.current = null; }
  };
  const refresh = () => {
    if (!isRetrying && !(retryLock.current && isActive(retryLock.current)) && session
      && isActive({ repairId, session }) && captureRepairEmailSession()) {
      mutation.reset();
      void query.refetch();
    }
  };

  return {
    status: query.data,
    isLoading: query.isPending && query.isFetching,
    isRefreshing: query.isFetching,
    isRetrying,
    isError: query.isError,
    retryFailed: mutation.isError && mutationIsCurrent,
    isAvailable: session !== null,
    canRetry,
    refresh,
    retry,
  };
};

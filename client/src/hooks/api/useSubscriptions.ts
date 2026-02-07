import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SubscriptionListResponse } from '@bookoflegends/shared';

/**
 * Fetch user's watched threads.
 */
export function useSubscriptions(page: number = 1, enabled: boolean = true) {
  return useQuery({
    queryKey: ['subscriptions', page],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionListResponse>(`/subscriptions?page=${page}`);
      return data;
    },
    enabled,
  });
}

/**
 * Subscribe to a thread.
 */
export function useSubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      await api.post(`/threads/${threadId}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['thread'] });
    },
  });
}

/**
 * Unsubscribe from a thread.
 */
export function useUnsubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      await api.delete(`/threads/${threadId}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['thread'] });
    },
  });
}

interface ToggleSubscriptionParams {
  threadId: string;
  page: number;
  isSubscribing: boolean;
}

/**
 * Toggle thread subscription with optimistic updates.
 * Immediately updates the UI, then syncs with the server.
 */
export function useToggleSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, isSubscribing }: ToggleSubscriptionParams) => {
      if (isSubscribing) {
        await api.post(`/threads/${threadId}/subscribe`);
      } else {
        await api.delete(`/threads/${threadId}/subscribe`);
      }
    },

    onMutate: async ({ threadId, page, isSubscribing }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['thread', threadId, page] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['thread', threadId, page]);

      // Optimistically update the cache
      queryClient.setQueryData(['thread', threadId, page], (old: { is_subscribed?: boolean } | undefined) => {
        if (!old) return old;
        return { ...old, is_subscribed: isSubscribing };
      });

      return { previousData };
    },

    onError: (_err, { threadId, page }, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(['thread', threadId, page], context.previousData);
      }
    },

    onSettled: (_data, _error, { threadId, page }) => {
      // Refetch to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, page] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}

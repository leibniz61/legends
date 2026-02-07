import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/lib/api';
import type {
  ThreadDetailResponse,
  ThreadListResponse,
  CategoryListResponse,
} from '@bookoflegends/shared';

/**
 * Hook for prefetching data on hover/focus to improve perceived navigation speed.
 * Uses React Query's prefetchQuery to load data before navigation.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch a thread with its posts (page 1).
   */
  const prefetchThread = useCallback(
    (threadId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['thread', threadId, 1],
        queryFn: async () => {
          const { data } = await api.get<ThreadDetailResponse>(`/threads/${threadId}?page=1`);
          return data;
        },
        staleTime: 30000, // Consider fresh for 30 seconds
      });
    },
    [queryClient]
  );

  /**
   * Prefetch threads for a category (page 1).
   */
  const prefetchCategory = useCallback(
    (slug: string) => {
      queryClient.prefetchQuery({
        queryKey: ['category', slug, 'threads', 1],
        queryFn: async () => {
          const { data } = await api.get<ThreadListResponse>(`/categories/${slug}/threads?page=1`);
          return data;
        },
        staleTime: 30000,
      });
    },
    [queryClient]
  );

  /**
   * Prefetch all categories (for homepage).
   */
  const prefetchCategories = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const { data } = await api.get<CategoryListResponse>('/categories');
        return data;
      },
      staleTime: 60000, // Categories change infrequently
    });
  }, [queryClient]);

  return {
    prefetchThread,
    prefetchCategory,
    prefetchCategories,
  };
}

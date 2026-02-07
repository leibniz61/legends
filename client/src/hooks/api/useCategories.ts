import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CategoryListResponse, ThreadListResponse } from '@bookoflegends/shared';

/**
 * Fetch all categories (for homepage).
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryListResponse>('/categories');
      return data;
    },
  });
}

/**
 * Fetch threads in a category.
 */
export function useCategoryThreads(slug: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['category', slug, 'threads', page],
    queryFn: async () => {
      const { data } = await api.get<ThreadListResponse>(`/categories/${slug}/threads?page=${page}`);
      return data;
    },
    enabled: !!slug,
  });
}

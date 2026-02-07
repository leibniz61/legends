import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ThreadDetailResponse } from '@bookoflegends/shared';

/**
 * Fetch a thread with its posts.
 */
export function useThread(id: string | undefined, page: number = 1) {
  return useQuery({
    queryKey: ['thread', id, page],
    queryFn: async () => {
      const { data } = await api.get<ThreadDetailResponse>(`/threads/${id}?page=${page}`);
      return data;
    },
    enabled: !!id,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ReportListResponse, ReportStatsResponse, ReportStatus } from '@bookoflegends/shared';

/**
 * Fetch reports (admin only).
 */
export function useReports(
  status: ReportStatus = 'pending',
  page: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: async () => {
      const { data } = await api.get<ReportListResponse>(
        `/admin/reports?status=${status}&page=${page}`
      );
      return data;
    },
    enabled,
  });
}

/**
 * Fetch report stats (pending count).
 */
export function useReportStats(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'reports', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<ReportStatsResponse>('/admin/reports/stats');
      return data;
    },
    enabled,
  });
}

/**
 * Create a report for a post.
 */
export function useCreateReport() {
  return useMutation({
    mutationFn: async ({
      postId,
      reason,
      details,
    }: {
      postId: string;
      reason: string;
      details?: string;
    }) => {
      await api.post(`/posts/${postId}/report`, { reason, details });
    },
  });
}

/**
 * Update a report status (admin only).
 */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      resolution_notes,
    }: {
      reportId: string;
      status: ReportStatus;
      resolution_notes?: string;
    }) => {
      await api.put(`/admin/reports/${reportId}`, { status, resolution_notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

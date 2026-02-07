import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import type { ExtendedReport, ReportListResponse } from '@bookoflegends/shared';
import {
  REPORTS_PER_PAGE,
  REPORT_STATUS_LABELS,
  REPORT_REASON_LABELS,
  type ReportStatus,
} from '@bookoflegends/shared';
import { PaginationControls, EmptyState, LoadingState } from '@/components/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Flag,
  CheckCircle,
  XCircle,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Ban,
  Shield,
} from 'lucide-react';

const STATUS_TABS: { value: ReportStatus; label: string }[] = [
  { value: 'pending', label: REPORT_STATUS_LABELS.pending },
  { value: 'resolved', label: REPORT_STATUS_LABELS.resolved },
  { value: 'dismissed', label: REPORT_STATUS_LABELS.dismissed },
];

export default function ModerationQueue() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as ReportStatus) || 'pending';
  const page = parseInt(searchParams.get('page') || '1');
  const queryClient = useQueryClient();

  const [resolvingReport, setResolvingReport] = useState<ExtendedReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: async () => {
      const { data } = await api.get(`/admin/reports?status=${status}&page=${page}`);
      return data as ReportListResponse;
    },
    enabled: !!profile && profile.role === 'admin',
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      reportId,
      newStatus,
      notes,
    }: {
      reportId: string;
      newStatus: ReportStatus;
      notes?: string;
    }) => {
      await api.put(`/admin/reports/${reportId}`, {
        status: newStatus,
        resolution_notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setResolvingReport(null);
      setResolutionNotes('');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto">
        <EmptyState icon={Shield} message="Admin access required" />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / REPORTS_PER_PAGE) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Flag className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-heading font-bold">Moderation Queue</h1>
      </div>

      <Tabs
        value={status}
        onValueChange={(val) => setSearchParams({ status: val, page: '1' })}
        className="mb-6"
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingState variant="list" count={2} />
      ) : !data?.reports?.length ? (
        <EmptyState icon={Flag} message={`No ${status} reports`} />
      ) : (
        <div className="space-y-4">
          {data.reports.map((report) => (
            <Card key={report.id} className="bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">
                      {REPORT_REASON_LABELS[report.reason]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Reported {formatDistanceToNow(new Date(report.created_at))} ago
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/threads/${report.post.thread_id}#post-${report.post.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View Post
                      </Link>
                    </Button>
                    {status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => deletePostMutation.mutate(report.post.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Post
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/users?search=${report.post.author.username}`}>
                              <Ban className="mr-2 h-4 w-4" />
                              Ban Author
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reporter info */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Reported by:</span>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={report.reporter.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(report.reporter.display_name || report.reporter.username).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/u/${report.reporter.username}`}
                    className="hover:text-primary transition-colors"
                  >
                    {report.reporter.display_name || report.reporter.username}
                  </Link>
                </div>

                {/* Report details */}
                {report.details && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Additional context:</p>
                    <p className="text-sm">{report.details}</p>
                  </div>
                )}

                {/* Reported post content */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={report.post.author.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(report.post.author.display_name || report.post.author.username).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      to={`/u/${report.post.author.username}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {report.post.author.display_name || report.post.author.username}
                    </Link>
                  </div>
                  <div
                    className="prose prose-sm max-w-none p-3 max-h-48 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(report.post.content_html),
                    }}
                  />
                </div>

                {/* Resolution notes (for resolved/dismissed) */}
                {report.resolution_notes && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Resolution notes:</p>
                    <p className="text-sm">{report.resolution_notes}</p>
                    {report.reviewer && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed by {report.reviewer.display_name || report.reviewer.username}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons for pending */}
                {status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" onClick={() => setResolvingReport(report)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          reportId: report.id,
                          newStatus: 'dismissed',
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setSearchParams({ status, page: String(newPage) })}
      />

      {/* Resolution dialog */}
      <Dialog open={!!resolvingReport} onOpenChange={() => setResolvingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Mark this report as resolved and optionally add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Resolution notes (optional)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolvingReport(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                resolvingReport &&
                updateMutation.mutate({
                  reportId: resolvingReport.id,
                  newStatus: 'resolved',
                  notes: resolutionNotes || undefined,
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Resolve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

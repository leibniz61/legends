import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionListResponse } from "@bookoflegends/shared";
import { SUBSCRIPTIONS_PER_PAGE } from "@bookoflegends/shared";
import {
  PaginationControls,
  EmptyState,
  LoadingState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import ThreadCard from "@/components/forum/ThreadCard";
import { Eye, EyeOff } from "lucide-react";

export default function WatchList() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", page],
    queryFn: async () => {
      const { data } = await api.get(`/subscriptions?page=${page}`);
      return data as SubscriptionListResponse;
    },
    enabled: !!profile,
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (threadId: string) => {
      await api.delete(`/threads/${threadId}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingState variant="thread" count={5} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Eye}
          message="Please sign in to view your watched threads."
        />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / SUBSCRIPTIONS_PER_PAGE) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold">Watched Threads</h1>
      </div>

      {isLoading ? (
        <LoadingState variant="thread" count={5} />
      ) : !data?.subscriptions?.length ? (
        <EmptyState
          icon={Eye}
          message="You're not watching any threads yet."
          description="Click the 'Watch' button on any thread to get notified of new replies."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data.subscriptions.map((sub) => (
            <ThreadCard
              key={sub.id}
              thread={sub.thread}
              rightAction={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unsubscribeMutation.mutate(sub.thread.id)}
                  disabled={unsubscribeMutation.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              }
            />
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) => setSearchParams({ page: String(newPage) })}
      />
    </div>
  );
}

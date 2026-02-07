import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { UNREAD_PER_PAGE } from "@bookoflegends/shared";
import {
  PaginationControls,
  EmptyState,
  LoadingState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThreadCard from "@/components/forum/ThreadCard";
import { Sparkles, CheckCheck } from "lucide-react";

// Local types until shared is rebuilt
interface UnreadThread {
  id: string;
  title: string;
  slug: string;
  post_count: number;
  view_count: number;
  last_post_at: string;
  is_locked: boolean;
  has_unread: boolean;
  unread_count: number;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UnreadListResponse {
  threads: UnreadThread[];
  total: number;
  page: number;
}

export default function WhatsNew() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");
  const filter = searchParams.get("filter") || "all";
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["unread", page, filter],
    queryFn: async () => {
      const { data } = await api.get(`/unread?page=${page}&filter=${filter}`);
      return data as UnreadListResponse;
    },
    enabled: !!profile,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      refetch();
    },
  });

  const handleFilterChange = (newFilter: string) => {
    setSearchParams({ filter: newFilter, page: "1" });
  };

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
          icon={Sparkles}
          message="Please sign in to see what's new."
        />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / UNREAD_PER_PAGE) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold">What's New</h1>
        </div>
        {data?.threads?.length ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        ) : null}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={handleFilterChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="subscribed">Watching</TabsTrigger>
          <TabsTrigger value="mine">My Threads</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingState variant="thread" count={5} />
      ) : !data?.threads?.length ? (
        <EmptyState
          icon={Sparkles}
          message="You're all caught up!"
          description="No unread posts right now. Check back later for new activity."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data.threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              hasUnread={true}
              unreadCount={thread.unread_count}
            />
          ))}
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={(newPage) =>
          setSearchParams({ filter, page: String(newPage) })
        }
      />
    </div>
  );
}

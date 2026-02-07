import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import DOMPurify from "dompurify";
import MDEditor from "@uiw/react-md-editor";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Thread, Post, ReactionSummary } from "@bookoflegends/shared";
import { POSTS_PER_PAGE } from "@bookoflegends/shared";
import { formatDistanceToNow } from "date-fns";
import PostEditor from "@/components/forum/PostEditor";
import ReactionPicker from "@/components/forum/ReactionPicker";
import WatchButton from "@/components/forum/WatchButton";
import ReportDialog from "@/components/forum/ReportDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pin,
  Lock,
  Shield,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Quote,
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  Flag,
} from "lucide-react";

export default function ThreadView() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");
  const [newPostCount, setNewPostCount] = useState(0);
  const [quoteContent, setQuoteContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["thread", id, page],
    queryFn: async () => {
      const { data } = await api.get(`/threads/${id}?page=${page}`);
      return data as {
        thread: Thread & {
          is_subscribed: boolean;
          category: {
            id: string;
            name: string;
            slug: string;
            parent: { id: string; name: string; slug: string } | null;
          };
        };
        posts: (Post & {
          reactions: ReactionSummary;
          user_reactions: Array<{ id: string; reaction_type: string }>;
        })[];
        total: number;
        page: number;
        first_unread_post?: number;
      };
    },
  });

  // Scroll to first unread post when data loads
  useEffect(() => {
    if (data?.first_unread_post && page === 1) {
      const firstUnreadIndex = data.first_unread_post - 1;
      const postElement = document.getElementById(
        `post-${data.posts[firstUnreadIndex]?.id}`,
      );
      if (postElement) {
        setTimeout(() => {
          postElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [data?.first_unread_post, data?.posts, page]);

  const editMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      await api.put(`/posts/${postId}`, { content });
    },
    onSuccess: () => {
      setEditingPostId(null);
      setEditContent("");
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: () => {
      setDeletePostId(null);
      refetch();
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => api.put(`/threads/${id}/pin`),
    onSuccess: () => refetch(),
  });

  const lockMutation = useMutation({
    mutationFn: () => api.put(`/threads/${id}/lock`),
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `thread_id=eq.${id}`,
        },
        () => {
          setNewPostCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  function handleNewPostsClick() {
    setNewPostCount(0);
    refetch();
  }

  function handleQuote(post: Post, postNumber: number) {
    const author =
      post.author?.display_name || post.author?.username || "Unknown";
    const quote = `> **${author}** wrote in [#${postNumber}](#post-${post.id}):\n> ${post.content.split("\n").join("\n> ")}\n\n`;
    setQuoteContent(quote);
    editorRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleEditClick(post: Post) {
    setEditingPostId(post.id);
    setEditContent(post.content);
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    return (
      <Card className="bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          {status === 404
            ? "Thread not found"
            : "Failed to load thread. Please try again."}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { thread, posts } = data;
  const totalPages = Math.ceil(data.total / POSTS_PER_PAGE);
  const firstPostId = posts[0]?.id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-1">/</span>
        {thread.category.parent && (
          <>
            <Link
              to={`/c/${thread.category.parent.slug}`}
              className="hover:text-primary transition-colors"
            >
              {thread.category.parent.name}
            </Link>
            <span className="mx-1">/</span>
          </>
        )}
        <Link
          to={`/c/${thread.category.slug}`}
          className="hover:text-primary transition-colors"
        >
          {thread.category.name}
        </Link>
      </nav>

      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{thread.title}</h1>
          <div className="flex items-center gap-2">
            {profile && (
              <WatchButton
                threadId={thread.id}
                page={page}
                isWatching={thread.is_subscribed}
              />
            )}
            {profile?.role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => pinMutation.mutate()}>
                    <Pin className="mr-2 h-4 w-4" />
                    {thread.is_pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => lockMutation.mutate()}>
                    <Lock className="mr-2 h-4 w-4" />
                    {thread.is_locked ? "Unlock" : "Lock"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {thread.is_pinned && (
            <span title="Pinned">
              <Pin className="h-4 w-4 text-primary" />
            </span>
          )}
          {thread.is_locked && (
            <span title="Locked">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </div>
      </div>

      {/* New posts banner */}
      {newPostCount > 0 && (
        <Button
          variant="outline"
          className="w-full mb-4 border-primary/40 text-primary hover:bg-primary/10"
          onClick={handleNewPostsClick}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {newPostCount} new {newPostCount === 1 ? "reply" : "replies"} — Click
          to load
        </Button>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post, index) => {
          const postNumber = (page - 1) * POSTS_PER_PAGE + index + 1;
          const isOwner = profile?.id === post.author_id;
          const isAdmin = profile?.role === "admin";
          const canEdit = (isOwner || isAdmin) && !thread.is_locked;
          const canDelete = (isOwner || isAdmin) && post.id !== firstPostId;
          const isUnread =
            data.first_unread_post && postNumber >= data.first_unread_post;
          const isFirstUnread = postNumber === data.first_unread_post;

          return (
            <Card
              key={post.id}
              id={`post-${post.id}`}
              className={`bg-card/50 overflow-hidden ${isUnread ? "border-l-2 border-l-primary" : ""}`}
            >
              <CardContent className="p-0">
                {/* Post header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.author?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-heading">
                        {(
                          post.author?.display_name ||
                          post.author?.username ||
                          "?"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/u/${post.author?.username}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {post.author?.display_name ||
                            post.author?.username ||
                            "Unknown"}
                        </Link>
                        {post.author?.role === "admin" && (
                          <Badge className="gap-1 text-[10px] px-1.5 py-0">
                            <Shield className="h-2.5 w-2.5" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFirstUnread && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0"
                      >
                        NEW
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at))} ago
                      {post.is_edited && " (edited)"}
                    </span>
                  </div>
                </div>

                {/* Post content */}
                {editingPostId === post.id ? (
                  <div className="p-4">
                    <div data-color-mode="dark">
                      <MDEditor
                        value={editContent}
                        onChange={(val) => setEditContent(val || "")}
                        height={200}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          editMutation.mutate({
                            postId: post.id,
                            content: editContent,
                          })
                        }
                        disabled={editMutation.isPending || !editContent.trim()}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPostId(null);
                          setEditContent("");
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none p-4"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(post.content_html),
                    }}
                  />
                )}

                {/* Post footer */}
                <div className="flex items-center justify-between px-4 pb-3">
                  <span className="text-xs text-muted-foreground/50">
                    #{postNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Reactions */}
                    {profile && (
                      <ReactionPicker
                        postId={post.id}
                        threadId={id!}
                        page={page}
                        reactions={post.reactions || {}}
                        userReactions={post.user_reactions || []}
                      />
                    )}

                    {/* Quote button */}
                    {profile && !thread.is_locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-primary"
                        onClick={() => handleQuote(post, postNumber)}
                      >
                        <Quote className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Post actions dropdown */}
                    {profile && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => handleEditClick(post)}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && !thread.is_locked && (
                            <DropdownMenuItem
                              onClick={() => setDeletePostId(post.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          {!isOwner && (
                            <DropdownMenuItem
                              onClick={() => setReportPostId(post.id)}
                            >
                              <Flag className="mr-2 h-3.5 w-3.5" />
                              Report
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setSearchParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setSearchParams({ page: String(page + 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Separator className="my-8" />

      {/* Reply form */}
      {profile && !thread.is_locked ? (
        <div ref={editorRef}>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reply
          </h2>
          <PostEditor
            threadId={thread.id}
            onSuccess={() => {
              setQuoteContent("");
              refetch();
            }}
            initialContent={quoteContent}
          />
        </div>
      ) : thread.is_locked ? (
        <Card className="bg-muted/30">
          <CardContent className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            This thread is locked.
          </CardContent>
        </Card>
      ) : null}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletePostId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletePostId && deleteMutation.mutate(deletePostId)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <ReportDialog
        postId={reportPostId}
        open={!!reportPostId}
        onOpenChange={(open) => !open && setReportPostId(null)}
      />
    </div>
  );
}

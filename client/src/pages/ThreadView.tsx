import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Thread, Post } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';
import PostEditor from '@/components/forum/PostEditor';

export default function ThreadView() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const [newPostCount, setNewPostCount] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['thread', id, page],
    queryFn: async () => {
      const { data } = await api.get(`/threads/${id}?page=${page}`);
      return data as { thread: Thread & { category: { id: string; name: string; slug: string } }; posts: Post[]; total: number; page: number };
    },
  });

  // Real-time subscription for new posts
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`thread-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `thread_id=eq.${id}`,
        },
        () => {
          setNewPostCount((prev) => prev + 1);
        }
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

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading thread...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Thread not found</div>;
  }

  const { thread, posts } = data;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:underline">Home</Link>
        {' / '}
        <Link to={`/c/${thread.category.slug}`} className="hover:underline">
          {thread.category.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">{thread.title}</h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        {thread.is_pinned && <span className="bg-secondary px-2 py-0.5 rounded text-xs">Pinned</span>}
        {thread.is_locked && <span className="bg-secondary px-2 py-0.5 rounded text-xs">Locked</span>}
      </div>

      {/* New posts banner */}
      {newPostCount > 0 && (
        <button
          onClick={handleNewPostsClick}
          className="w-full py-2 mb-4 bg-primary/10 text-primary text-sm rounded-md hover:bg-primary/20"
        >
          {newPostCount} new {newPostCount === 1 ? 'reply' : 'replies'} - Click to load
        </button>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Link to={`/u/${post.author?.username}`} className="font-medium hover:underline">
                  {post.author?.display_name || post.author?.username || 'Unknown'}
                </Link>
                {post.author?.role === 'admin' && (
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Admin</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at))} ago
                {post.is_edited && ' (edited)'}
              </span>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          </div>
        ))}
      </div>

      {/* Reply form */}
      {profile && !thread.is_locked && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Reply</h2>
          <PostEditor threadId={thread.id} onSuccess={() => refetch()} />
        </div>
      )}

      {thread.is_locked && (
        <p className="mt-8 text-center text-muted-foreground">This thread is locked.</p>
      )}
    </div>
  );
}

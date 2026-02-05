import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, Thread } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

export default function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');

  const { data: categoryData } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}`);
      return data.category as Category;
    },
  });

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ['threads', slug, page],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}/threads?page=${page}`);
      return data as { threads: Thread[]; total: number; page: number };
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{categoryData?.name || slug}</h1>
          {categoryData?.description && (
            <p className="text-muted-foreground mt-1">{categoryData.description}</p>
          )}
        </div>
        {profile && (
          <Link
            to={`/c/${slug}/new`}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90"
          >
            New Thread
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading threads...</div>
      ) : (
        <div className="space-y-1">
          {threadsData?.threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/threads/${thread.id}`}
              className="block p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {thread.is_pinned && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">Pinned</span>
                  )}
                  {thread.is_locked && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">Locked</span>
                  )}
                  <h3 className="font-medium">{thread.title}</h3>
                </div>
                <div className="text-right text-sm text-muted-foreground whitespace-nowrap ml-4">
                  <div>{thread.post_count} posts</div>
                  <div>{formatDistanceToNow(new Date(thread.last_post_at))} ago</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                by {thread.author?.display_name || thread.author?.username || 'Unknown'}
              </div>
            </Link>
          ))}

          {threadsData?.threads.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">
              No threads yet. Be the first to start a discussion!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

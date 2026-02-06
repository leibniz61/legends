import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Thread, CategoryWithParent } from '@bookoflegends/shared';
import { THREADS_PER_PAGE } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pin, Lock, MessageSquare, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');

  const { data: categoryData } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}`);
      return data.category as CategoryWithParent;
    },
  });

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ['threads', slug, page],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}/threads?page=${page}`);
      return data as { threads: Thread[]; total: number; page: number };
    },
  });

  const totalPages = threadsData ? Math.ceil(threadsData.total / THREADS_PER_PAGE) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="mx-2">/</span>
            {categoryData?.parent && (
              <>
                <Link to={`/c/${categoryData.parent.slug}`} className="hover:text-primary transition-colors">
                  {categoryData.parent.name}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span>{categoryData?.name || slug}</span>
          </nav>
          <h1 className="text-2xl font-heading font-bold">{categoryData?.name || slug}</h1>
          {categoryData?.description && (
            <p className="text-muted-foreground mt-1">{categoryData.description}</p>
          )}
        </div>
        {profile && (
          <Button asChild>
            <Link to={`/c/${slug}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Thread
            </Link>
          </Button>
        )}
      </div>

      {/* Thread list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : threadsData?.threads.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            No threads yet. Be the first to start a discussion!
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {threadsData?.threads.map((thread) => (
              <Link key={thread.id} to={`/threads/${thread.id}`}>
                <Card className="bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {thread.is_pinned && (
                            <Badge variant="secondary" className="gap-1">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </Badge>
                          )}
                          {thread.is_locked && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Locked
                            </Badge>
                          )}
                          <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                            {thread.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {thread.author?.display_name || thread.author?.username || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{thread.post_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(thread.last_post_at))} ago</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
        </>
      )}
    </div>
  );
}

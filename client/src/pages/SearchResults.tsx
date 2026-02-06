import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'threads';

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query)}&type=${type}`);
      return data;
    },
    enabled: !!query,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-2">Search Results</h1>
      <p className="text-muted-foreground mb-6">
        {query ? (
          <>Results for <span className="text-primary font-medium">"{query}"</span></>
        ) : (
          'Enter a search query'
        )}
      </p>

      {/* Type toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={type === 'threads' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchParams({ q: query, type: 'threads' })}
        >
          Threads
        </Button>
        <Button
          variant={type === 'posts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchParams({ q: query, type: 'posts' })}
        >
          Posts
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.results?.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Search className="h-8 w-8 opacity-50" />
            No results found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.results?.map((result: Record<string, unknown>) => (
            <Link
              key={result.id as string}
              to={type === 'threads' ? `/threads/${result.id}` : `/threads/${(result.thread as Record<string, unknown>)?.id}`}
            >
              <Card className="bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4">
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {type === 'threads' ? (result.title as string) : ((result.thread as Record<string, unknown>)?.title as string)}
                  </h3>
                  {type === 'posts' && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {(result.content as string)?.slice(0, 200)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    by {(result.author as Record<string, unknown>)?.username as string} &middot;{' '}
                    {formatDistanceToNow(new Date(result.created_at as string))} ago
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

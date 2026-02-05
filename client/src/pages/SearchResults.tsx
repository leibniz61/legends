import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

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
    <div>
      <h1 className="text-2xl font-bold mb-2">Search Results</h1>
      <p className="text-muted-foreground mb-6">
        {query ? `Results for "${query}"` : 'Enter a search query'}
      </p>

      {/* Type toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSearchParams({ q: query, type: 'threads' })}
          className={`px-3 py-1.5 rounded-md text-sm ${type === 'threads' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
        >
          Threads
        </button>
        <button
          onClick={() => setSearchParams({ q: query, type: 'posts' })}
          className={`px-3 py-1.5 rounded-md text-sm ${type === 'posts' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
        >
          Posts
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Searching...</div>
      ) : (
        <div className="space-y-2">
          {data?.results?.map((result: Record<string, unknown>) => (
            <Link
              key={result.id as string}
              to={type === 'threads' ? `/threads/${result.id}` : `/threads/${(result.thread as Record<string, unknown>)?.id}`}
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="font-medium">
                {type === 'threads' ? (result.title as string) : ((result.thread as Record<string, unknown>)?.title as string)}
              </h3>
              {type === 'posts' && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {(result.content as string)?.slice(0, 200)}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                by {(result.author as Record<string, unknown>)?.username as string} &middot;{' '}
                {formatDistanceToNow(new Date(result.created_at as string))} ago
              </div>
            </Link>
          ))}

          {data?.results?.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}

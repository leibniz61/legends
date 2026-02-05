import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import type { Category } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.categories as Category[];
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Book of Legends</h1>
      <p className="text-muted-foreground mb-8">A community for fantasy literature enthusiasts</p>

      <div className="space-y-2">
        {data?.map((category) => (
          <Link
            key={category.id}
            to={`/c/${category.slug}`}
            className="block p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg">{category.name}</h2>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{category.thread_count} threads</div>
                <div>{category.post_count} posts</div>
                {category.last_post_at && (
                  <div>Last post {formatDistanceToNow(new Date(category.last_post_at))} ago</div>
                )}
              </div>
            </div>
          </Link>
        ))}

        {data?.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">
            No categories yet. An admin needs to create some.
          </p>
        )}
      </div>
    </div>
  );
}

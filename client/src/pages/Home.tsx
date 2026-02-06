import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import api from '@/lib/api';
import type { Category, CategoryWithChildren } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ScrollText, Clock, ChevronRight, ChevronDown } from 'lucide-react';

function CategoryCard({ category, isSubcategory = false }: { category: Category; isSubcategory?: boolean }) {
  return (
    <Link to={`/c/${category.slug}`}>
      <Card className={`bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group ${isSubcategory ? 'border-l-2 border-l-primary/30' : ''}`}>
        <CardContent className={isSubcategory ? 'p-4' : 'p-5'}>
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h2 className={`font-heading font-semibold group-hover:text-primary transition-colors truncate ${isSubcategory ? 'text-base' : 'text-lg'}`}>
                {category.name}
              </h2>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground shrink-0">
              <div className="flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5" />
                <span>{category.thread_count} threads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{category.post_count} posts</span>
              </div>
              {category.last_post_at && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(category.last_post_at))} ago</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ParentCategoryGroup({ category }: { category: CategoryWithChildren }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = category.children.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="p-1.5 mt-3 hover:bg-muted rounded transition-colors shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-7 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <CategoryCard category={category} />
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent className="space-y-2 ml-9">
            {category.children.map((child) => (
              <CategoryCard key={child.id} category={child} isSubcategory />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.categories as CategoryWithChildren[];
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-3 tracking-wide">
          Book of Legends
        </h1>
        <p className="text-muted-foreground text-lg">
          A Pathfinder RPG Community
        </p>
        <Separator className="mt-6 max-w-xs mx-auto opacity-30" />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              No categories yet. An admin needs to create some.
            </CardContent>
          </Card>
        ) : (
          data?.map((category) => (
            <ParentCategoryGroup key={category.id} category={category} />
          ))
        )}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText, MessageSquare, Clock } from 'lucide-react';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thread_count: number;
  post_count: number;
  last_post_at?: string | null;
}

interface CategoryCardProps {
  category: CategoryData;
  /** Compact mode for subcategories (default: false) */
  compact?: boolean;
  /** Show icon on left (default: false) */
  showIcon?: boolean;
  /** Show last activity time (default: true) */
  showLastActivity?: boolean;
}

export default function CategoryCard({
  category,
  compact = false,
  showIcon = false,
  showLastActivity = true,
}: CategoryCardProps) {
  return (
    <Link to={`/c/${category.slug}`}>
      <Card
        className={`bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group ${
          compact ? 'border-l-2 border-l-primary/30' : ''
        }`}
      >
        <CardContent className={compact ? 'p-4' : 'p-5'}>
          <div className="flex items-start gap-3">
            {showIcon && (
              <ScrollText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {/* Name */}
              <h3
                className={`font-heading font-semibold group-hover:text-primary transition-colors truncate ${
                  compact ? 'text-sm' : 'text-lg'
                }`}
              >
                {category.name}
              </h3>

              {/* Description */}
              {category.description && (
                <p
                  className={`text-muted-foreground mt-1 ${
                    compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
                  }`}
                >
                  {category.description}
                </p>
              )}

              {/* Stats row (inline like ThreadCard) */}
              <div
                className={`flex items-center gap-2 mt-2 text-muted-foreground ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
              >
                <span className="flex items-center gap-1">
                  <ScrollText className="h-3 w-3" />
                  {category.thread_count}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {category.post_count}
                </span>
                {showLastActivity && category.last_post_at && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(category.last_post_at))} ago
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

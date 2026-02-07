import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingVariant = 'page' | 'list' | 'card' | 'thread' | 'category' | 'inline';

interface LoadingStateProps {
  variant?: LoadingVariant;
  count?: number;
  /** Show avatar skeleton (for thread variant) */
  showAvatar?: boolean;
}

export function LoadingState({ variant = 'page', count = 3, showAvatar = true }: LoadingStateProps) {
  switch (variant) {
    case 'page':
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );

    case 'list':
      return (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-card/50 rounded-lg p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      );

    case 'thread':
      return (
        <div className="flex flex-col gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {showAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case 'category':
      return (
        <div className="flex flex-col gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-72 mb-3" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case 'inline':
      return <Skeleton className="h-4 w-24" />;

    default:
      return null;
  }
}

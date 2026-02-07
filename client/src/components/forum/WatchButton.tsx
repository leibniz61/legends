import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useToggleSubscription } from '@/hooks/api';

interface WatchButtonProps {
  threadId: string;
  page: number;
  isWatching: boolean;
}

export default function WatchButton({ threadId, page, isWatching }: WatchButtonProps) {
  const toggleMutation = useToggleSubscription();

  function handleToggle() {
    toggleMutation.mutate({ threadId, page, isSubscribing: !isWatching });
  }

  return (
    <Button
      variant={isWatching ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={toggleMutation.isPending}
      className="gap-1.5"
    >
      {isWatching ? (
        <>
          <Eye className="h-3.5 w-3.5" />
          Watching
        </>
      ) : (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Watch
        </>
      )}
    </Button>
  );
}

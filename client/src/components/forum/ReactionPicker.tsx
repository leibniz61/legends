import { REACTION_TYPES, type ReactionType, type ReactionSummary } from '@bookoflegends/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SmilePlus } from 'lucide-react';
import { useToggleReaction } from '@/hooks/api';

interface ReactionPickerProps {
  postId: string;
  threadId: string;
  page: number;
  reactions: ReactionSummary;
  userReactions: Array<{ id: string; reaction_type: string }>;
  disabled?: boolean;
}

export default function ReactionPicker({
  postId,
  threadId,
  page,
  reactions,
  userReactions,
  disabled,
}: ReactionPickerProps) {
  const userReactionTypes = new Set(userReactions.map((r) => r.reaction_type));
  const toggleMutation = useToggleReaction();

  function handleToggle(reactionType: ReactionType) {
    const isAdding = !userReactionTypes.has(reactionType);
    toggleMutation.mutate({ postId, reactionType, isAdding, threadId, page });
  }

  // Get reactions that have counts > 0
  const activeReactions = REACTION_TYPES.filter((r) => (reactions[r.type] || 0) > 0);
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + (count || 0), 0);

  return (
    <div className="flex items-center gap-1">
      {/* Display existing reactions */}
      {activeReactions.map((reaction) => {
        const count = reactions[reaction.type] || 0;
        const isActive = userReactionTypes.has(reaction.type);

        return (
          <Button
            key={reaction.type}
            variant="ghost"
            size="sm"
            className={`h-7 px-2 gap-1 ${
              isActive
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:text-primary'
            }`}
            onClick={() => handleToggle(reaction.type)}
            disabled={disabled || toggleMutation.isPending}
            title={reaction.label}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span className="text-xs">{count}</span>
          </Button>
        );
      })}

      {/* Add reaction dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-muted-foreground hover:text-primary ${
              totalReactions === 0 ? '' : ''
            }`}
            disabled={disabled || toggleMutation.isPending}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-0">
          <div className="flex gap-1 p-1">
            {REACTION_TYPES.map((reaction) => {
              const isActive = userReactionTypes.has(reaction.type);

              return (
                <Button
                  key={reaction.type}
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    isActive
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleToggle(reaction.type)}
                  disabled={toggleMutation.isPending}
                  title={reaction.label}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                </Button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

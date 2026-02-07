import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ReactionType, ThreadDetailResponse } from '@bookoflegends/shared';

interface ToggleReactionParams {
  postId: string;
  reactionType: ReactionType;
  isAdding: boolean;
  threadId: string;
  page: number;
}

/**
 * Toggle a reaction on a post with optimistic updates.
 * Immediately updates the UI, then syncs with the server.
 */
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reactionType, isAdding }: ToggleReactionParams) => {
      if (isAdding) {
        await api.post(`/posts/${postId}/reactions`, { reaction_type: reactionType });
      } else {
        await api.delete(`/posts/${postId}/reactions`, { data: { reaction_type: reactionType } });
      }
    },

    onMutate: async ({ postId, reactionType, isAdding, threadId, page }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['thread', threadId, page] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ThreadDetailResponse>(['thread', threadId, page]);

      // Optimistically update the cache
      queryClient.setQueryData<ThreadDetailResponse>(['thread', threadId, page], (old) => {
        if (!old) return old;

        return {
          ...old,
          posts: old.posts.map((post) => {
            if (post.id !== postId) return post;

            const currentCount = post.reactions[reactionType] || 0;
            const newReactions = {
              ...post.reactions,
              [reactionType]: isAdding ? currentCount + 1 : Math.max(0, currentCount - 1),
            };

            const newUserReactions = isAdding
              ? [...post.user_reactions, { id: 'temp', reaction_type: reactionType }]
              : post.user_reactions.filter((r) => r.reaction_type !== reactionType);

            return {
              ...post,
              reactions: newReactions,
              user_reactions: newUserReactions,
            };
          }),
        };
      });

      return { previousData };
    },

    onError: (_err, { threadId, page }, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(['thread', threadId, page], context.previousData);
      }
    },

    onSettled: (_data, _error, { threadId, page }) => {
      // Refetch to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, page] });
    },
  });
}

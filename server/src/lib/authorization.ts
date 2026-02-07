import type { Profile } from '@bookoflegends/shared';

/**
 * Centralized authorization helpers.
 * Use these instead of inline auth checks to ensure consistent policy enforcement.
 */

export interface ResourceWithAuthor {
  author_id: string;
}

export interface ResourceWithUser {
  user_id: string;
}

/**
 * Check if user can modify a resource (owner or admin)
 */
export function canModify(resource: ResourceWithAuthor, user: Profile): boolean {
  return resource.author_id === user.id || user.role === 'admin';
}

/**
 * Check if user owns a resource
 */
export function isOwner(resource: ResourceWithAuthor, user: Profile): boolean {
  return resource.author_id === user.id;
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: Profile): boolean {
  return user.role === 'admin';
}

/**
 * Check if user can delete a post (must be owner or admin, and not the first post)
 */
export function canDeletePost(
  post: ResourceWithAuthor,
  user: Profile,
  isFirstPost: boolean
): boolean {
  if (isFirstPost) return false;
  return canModify(post, user);
}

/**
 * Check if user can edit content (owner or admin, thread not locked)
 */
export function canEditContent(
  resource: ResourceWithAuthor,
  user: Profile,
  isLocked: boolean
): boolean {
  if (isLocked) return false;
  return canModify(resource, user);
}

/**
 * Check if user can manage a subscription (must be the subscriber)
 */
export function canManageSubscription(
  subscription: ResourceWithUser,
  user: Profile
): boolean {
  return subscription.user_id === user.id;
}

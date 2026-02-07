import { supabaseAdmin } from '../config/supabase.js';
import { extractMentions } from '../lib/markdown.js';
import type { Profile, NotificationType } from '@bookoflegends/shared';

interface ThreadInfo {
  id: string;
  title: string;
  author_id: string;
}

interface PostInfo {
  id: string;
  content: string;
}

interface NotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  link: string;
}

/**
 * Create notifications for various events.
 * Centralizes notification logic that was previously scattered across routes.
 */

/**
 * Notify the thread author when someone replies (excluding self-replies)
 */
export async function notifyThreadOwner(
  thread: ThreadInfo,
  replier: Profile
): Promise<void> {
  if (thread.author_id === replier.id) return;

  await supabaseAdmin.from('notifications').insert({
    user_id: thread.author_id,
    type: 'reply_to_thread' as NotificationType,
    title: `${replier.username} replied to your thread`,
    link: `/threads/${thread.id}`,
  });
}

/**
 * Notify all thread subscribers of a new post (excluding the author and thread owner)
 */
export async function notifySubscribers(
  thread: ThreadInfo,
  postAuthor: Profile
): Promise<void> {
  const { data: subscribers } = await supabaseAdmin
    .from('thread_subscriptions')
    .select('user_id')
    .eq('thread_id', thread.id)
    .neq('user_id', postAuthor.id)
    .neq('user_id', thread.author_id);

  if (!subscribers?.length) return;

  const notifications: NotificationData[] = subscribers.map((s) => ({
    user_id: s.user_id,
    type: 'watched_thread' as NotificationType,
    title: `New reply in "${thread.title}"`,
    link: `/threads/${thread.id}`,
  }));

  await supabaseAdmin.from('notifications').insert(notifications);
}

/**
 * Notify mentioned users in a post (excluding self, thread owner, and subscribers)
 */
export async function notifyMentionedUsers(
  post: PostInfo,
  thread: ThreadInfo,
  postAuthor: Profile,
  excludeUserIds: string[] = []
): Promise<void> {
  const mentionedUsernames = extractMentions(post.content);
  if (!mentionedUsernames.length) return;

  const { data: mentionedUsers } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .in('username', mentionedUsernames);

  if (!mentionedUsers?.length) return;

  const excludeSet = new Set([
    postAuthor.id,
    thread.author_id,
    ...excludeUserIds,
  ]);

  const notifications: NotificationData[] = mentionedUsers
    .filter((u) => !excludeSet.has(u.id))
    .map((u) => ({
      user_id: u.id,
      type: 'mention' as NotificationType,
      title: `${postAuthor.username} mentioned you`,
      link: `/threads/${thread.id}#post-${post.id}`,
    }));

  if (notifications.length) {
    await supabaseAdmin.from('notifications').insert(notifications);
  }
}

/**
 * Orchestrate all notifications for a new post.
 * Call this after successfully creating a post.
 */
export async function notifyOnNewPost(
  post: PostInfo,
  thread: ThreadInfo,
  author: Profile
): Promise<void> {
  // Get subscriber IDs first to avoid duplicate notifications
  const { data: subscribers } = await supabaseAdmin
    .from('thread_subscriptions')
    .select('user_id')
    .eq('thread_id', thread.id)
    .neq('user_id', author.id)
    .neq('user_id', thread.author_id);

  const subscriberIds = subscribers?.map((s) => s.user_id) || [];

  // Run notifications in parallel
  await Promise.all([
    notifyThreadOwner(thread, author),
    notifySubscribers(thread, author),
    notifyMentionedUsers(post, thread, author, subscriberIds),
  ]);
}

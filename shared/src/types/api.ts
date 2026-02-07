import type { Thread } from './thread.js';
import type { Post, ReactionSummary } from './post.js';
import type { Category, CategoryWithChildren, CategoryWithParent } from './category.js';
import type { Profile } from './user.js';
import type { Notification } from './notification.js';
import type { ContentReport } from './report.js';

/**
 * Shared API response types.
 * Use these on both client and server for type safety across the boundary.
 */

// ============================================================================
// Common patterns
// ============================================================================

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  items: T[];
}

// ============================================================================
// Thread responses
// ============================================================================

export interface ThreadWithCategory extends Thread {
  is_subscribed: boolean;
  category: CategoryWithParent & {
    parent: Pick<Category, 'id' | 'name' | 'slug'> | null;
  };
}

/** Post with reactions - uses lighter user_reactions array for the API response */
export interface PostWithReactions extends Omit<Post, 'user_reactions'> {
  reactions: ReactionSummary;
  user_reactions: Array<{ id: string; reaction_type: string }>;
}

export interface ThreadDetailResponse {
  thread: ThreadWithCategory;
  posts: PostWithReactions[];
  total: number;
  page: number;
}

/** Thread with read status for authenticated users */
export interface ThreadWithReadStatus extends Thread {
  has_unread: boolean;
  unread_count: number;
}

export interface ThreadListResponse {
  threads: (ThreadWithReadStatus & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> })[];
  total: number;
  page: number;
}

// ============================================================================
// Category responses
// ============================================================================

export interface CategoryListResponse {
  categories: CategoryWithChildren[];
}

// ============================================================================
// Subscription responses
// ============================================================================

export interface WatchedThread {
  id: string;
  created_at: string;
  thread: {
    id: string;
    title: string;
    slug: string;
    post_count: number;
    last_post_at: string;
    is_locked: boolean;
    author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
    category: Pick<Category, 'id' | 'name' | 'slug'>;
  };
}

export interface SubscriptionListResponse {
  subscriptions: WatchedThread[];
  total: number;
  page: number;
}

// ============================================================================
// Notification responses
// ============================================================================

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  unread_count: number;
}

// ============================================================================
// Search responses
// ============================================================================

export interface ThreadSearchResult {
  id: string;
  title: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'username'>;
}

export interface PostSearchResult {
  id: string;
  content: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'username'>;
  thread: {
    id: string;
    title: string;
  };
}

export interface SearchResponse {
  results: ThreadSearchResult[] | PostSearchResult[];
  total: number;
}

// ============================================================================
// Admin responses
// ============================================================================

/** Extended report with joined relations - overrides optional fields with required */
export interface ExtendedReport extends Omit<ContentReport, 'post' | 'reporter' | 'reviewer'> {
  post: {
    id: string;
    content: string;
    content_html: string;
    thread_id: string;
    author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  };
  reporter: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  reviewer?: Pick<Profile, 'id' | 'username' | 'display_name'>;
}

export interface ReportListResponse {
  reports: ExtendedReport[];
  total: number;
  page: number;
}

export interface ReportStatsResponse {
  pending_count: number;
}

export interface UserListResponse {
  users: Profile[];
  total: number;
  page: number;
}

// ============================================================================
// Unread/What's New responses
// ============================================================================

export interface UnreadThread extends Omit<ThreadWithReadStatus, 'author'> {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  category: Pick<Category, 'id' | 'name' | 'slug'>;
}

export interface UnreadListResponse {
  threads: UnreadThread[];
  total: number;
  page: number;
}

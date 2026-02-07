// Entity types
export type { Profile, ProfileUpdate } from './types/user.js';
export type { Category, CategoryCreate, CategoryUpdate, CategoryWithChildren, CategoryWithParent } from './types/category.js';
export type { Thread, ThreadCreate, ThreadUpdate, ThreadRead } from './types/thread.js';
export type { Post, PostCreate, PostUpdate, PostReaction, ReactionSummary } from './types/post.js';
export type { Notification, NotificationType } from './types/notification.js';
export type { ThreadSubscription } from './types/subscription.js';
export type { ContentReport, ReportReason } from './types/report.js';
export { REPORT_REASONS } from './types/report.js';

// API response types
export type {
  PaginatedResponse,
  ThreadWithCategory,
  ThreadWithReadStatus,
  PostWithReactions,
  ThreadDetailResponse,
  ThreadListResponse,
  CategoryListResponse,
  WatchedThread,
  SubscriptionListResponse,
  NotificationListResponse,
  ThreadSearchResult,
  PostSearchResult,
  SearchResponse,
  ExtendedReport,
  ReportListResponse,
  ReportStatsResponse,
  UserListResponse,
  UnreadThread,
  UnreadListResponse,
} from './types/api.js';

// Constants and helpers
export * from './constants.js';

// Validation schemas (Zod)
export * from './schemas/index.js';

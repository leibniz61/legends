// ============================================================================
// Pagination
// ============================================================================

export const THREADS_PER_PAGE = 25;
export const POSTS_PER_PAGE = 20;
export const NOTIFICATIONS_PER_PAGE = 20;
export const SEARCH_RESULTS_PER_PAGE = 20;
export const SUBSCRIPTIONS_PER_PAGE = 20;
export const REPORTS_PER_PAGE = 20;
export const USERS_PER_PAGE = 20;
export const UNREAD_PER_PAGE = 25;

// ============================================================================
// Validation limits
// ============================================================================

export const MAX_TITLE_LENGTH = 200;
export const MAX_POST_LENGTH = 50000;
export const MAX_BIO_LENGTH = 500;
export const MAX_USERNAME_LENGTH = 30;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_REPORT_DETAILS_LENGTH = 500;
export const MAX_RESOLUTION_NOTES_LENGTH = 500;

// ============================================================================
// User roles
// ============================================================================

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  admin: 'Administrator',
};

// ============================================================================
// Reactions (fantasy-themed)
// ============================================================================

export const REACTION_TYPES = [
  { type: 'like', emoji: '❤️', label: 'Like' },
  { type: 'sword', emoji: '⚔️', label: 'Battle-worthy' },
  { type: 'crown', emoji: '👑', label: 'Royal' },
  { type: 'scroll', emoji: '📜', label: 'Wise' },
  { type: 'dragon', emoji: '🐉', label: 'Epic' },
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number]['type'];

/** Helper to get reaction info by type */
export function getReactionInfo(type: ReactionType) {
  return REACTION_TYPES.find((r) => r.type === type);
}

// ============================================================================
// Notifications
// ============================================================================

export const NOTIFICATION_TYPES = [
  'reply_to_thread',
  'reply_to_post',
  'mention',
  'admin',
  'watched_thread',
] as const;

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  reply_to_thread: 'Reply to Thread',
  reply_to_post: 'Reply to Post',
  mention: 'Mention',
  admin: 'Admin Notice',
  watched_thread: 'Watched Thread',
};

// ============================================================================
// Reports
// ============================================================================

export const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  inappropriate: 'Inappropriate Content',
  off_topic: 'Off Topic',
  other: 'Other',
};

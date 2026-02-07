/**
 * Typed API hooks for React Query.
 * Use these instead of calling api.get/post directly for better type safety.
 */

export { useThread } from './useThread';
export { useSubscriptions, useSubscribe, useUnsubscribe, useToggleSubscription } from './useSubscriptions';
export { useCategories, useCategoryThreads } from './useCategories';
export {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './useNotifications';
export {
  useReports,
  useReportStats,
  useCreateReport,
  useUpdateReport,
} from './useReports';
export { useToggleReaction } from './useReactions';

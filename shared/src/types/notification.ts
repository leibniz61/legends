export type NotificationType = 'reply_to_thread' | 'reply_to_post' | 'mention' | 'admin' | 'watched_thread';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

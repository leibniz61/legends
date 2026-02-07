import type { Profile } from './user.js';

export interface Thread {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_locked: boolean;
  post_count: number;
  view_count: number;
  last_post_at: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface ThreadRead {
  user_id: string;
  thread_id: string;
  last_read_at: string;
  last_post_number: number;
}

export interface ThreadCreate {
  title: string;
  content: string; // First post body (markdown)
}

export interface ThreadUpdate {
  title?: string;
}

import type { Profile } from './user.js';

export interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_html: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface PostCreate {
  content: string; // Markdown
}

export interface PostUpdate {
  content: string; // Markdown
}

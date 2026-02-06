import type { Profile } from './user.js';

export interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_html: string;
  is_edited: boolean;
  reaction_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  user_reaction?: PostReaction | null;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface PostCreate {
  content: string; // Markdown
}

export interface PostUpdate {
  content: string; // Markdown
}

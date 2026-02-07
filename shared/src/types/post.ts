import type { Profile } from './user.js';
import type { ReactionType } from '../constants.js';

export interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_html: string;
  is_edited: boolean;
  reaction_count: number;
  reactions?: ReactionSummary;
  created_at: string;
  updated_at: string;
  author?: Profile;
  user_reactions?: PostReaction[];
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

// Maps reaction_type to count
export type ReactionSummary = Partial<Record<ReactionType, number>>;

export interface PostCreate {
  content: string; // Markdown
}

export interface PostUpdate {
  content: string; // Markdown
}

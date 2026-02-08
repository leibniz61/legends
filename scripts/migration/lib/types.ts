// Vanilla Forums source types
export interface VanillaUser {
  UserID: number;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  is_admin: number;
}

export interface VanillaCategory {
  CategoryID: number;
  ParentCategoryID: number | null;
  Name: string;
  Description: string | null;
  slug: string;
  sort_order: number;
  Depth: number;
}

export interface VanillaDiscussion {
  DiscussionID: number;
  CategoryID: number;
  author_id: number;
  title: string;
  Body: string;
  Format: string;
  is_pinned: number;
  is_locked: number;
  DateInserted: string;
  DateLastComment: string | null;
}

export interface VanillaComment {
  CommentID: number;
  thread_id: number;
  author_id: number;
  Body: string;
  Format: string;
  DateInserted: string;
  DateUpdated: string | null;
}

// Book of Legends target types
export interface TransformedUser {
  vanilla_id: number;
  new_uuid: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface TransformedCategory {
  vanilla_id: number;
  new_uuid: string;
  name: string;
  description: string | null;
  slug: string;
  sort_order: number;
  parent_id: string | null;
  created_at: string;
}

export interface TransformedThread {
  vanilla_id: number;
  new_uuid: string;
  category_id: string;
  author_id: string;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_post_at: string;
}

export interface TransformedPost {
  vanilla_id: number | null; // null for first posts converted from discussions
  new_uuid: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_html: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface IdMappings {
  users: Record<number, string>;
  categories: Record<number, string>;
  discussions: Record<number, string>;
  comments: Record<number, string>;
}

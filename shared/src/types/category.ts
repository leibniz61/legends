export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  sort_order: number;
  thread_count: number;
  post_count: number;
  last_post_at: string | null;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  slug: string;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  slug?: string;
  sort_order?: number;
}

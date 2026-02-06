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
  parent_id: string | null;
}

// For nested API responses (homepage)
export interface CategoryWithChildren extends Category {
  children: Category[];
}

// For breadcrumb navigation
export interface CategoryWithParent extends Category {
  parent: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  slug: string;
  sort_order?: number;
  parent_id?: string;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  slug?: string;
  sort_order?: number;
  parent_id?: string | null;
}

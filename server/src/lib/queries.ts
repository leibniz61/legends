import { supabaseAdmin } from '../config/supabase.js';
import { NotFoundError } from './errors.js';

/**
 * Common Supabase query helpers to reduce boilerplate.
 */

export interface PaginationOptions {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Execute a paginated query on any table.
 */
export async function paginatedQuery<T>(
  table: string,
  options: PaginationOptions & {
    select?: string;
    filter?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean }[];
  }
): Promise<PaginatedResult<T>> {
  const { page, perPage, select = '*', filter = {}, orderBy = [] } = options;
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin.from(table).select(select, { count: 'exact' });

  // Apply filters
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined) {
      query = query.eq(key, value);
    }
  });

  // Apply ordering
  orderBy.forEach(({ column, ascending = true }) => {
    query = query.order(column, { ascending });
  });

  // Apply pagination
  query = query.range(offset, offset + perPage - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data as T[]) || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / perPage),
  };
}

/**
 * Find a single record by ID or throw NotFoundError.
 */
export async function findByIdOrThrow<T>(
  table: string,
  id: string,
  options?: { select?: string; resourceName?: string }
): Promise<T> {
  const { select = '*', resourceName = table } = options || {};

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new NotFoundError(resourceName);
  }

  return data as T;
}

/**
 * Find a single record by a field or throw NotFoundError.
 */
export async function findByFieldOrThrow<T>(
  table: string,
  field: string,
  value: unknown,
  options?: { select?: string; resourceName?: string }
): Promise<T> {
  const { select = '*', resourceName = table } = options || {};

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq(field, value)
    .single();

  if (error || !data) {
    throw new NotFoundError(resourceName);
  }

  return data as T;
}

/**
 * Common select patterns for joins.
 */
export const SELECT = {
  // Profile fields commonly needed (for posts - no FK ambiguity)
  authorBasic: 'author:profiles(id, username, display_name, avatar_url)',
  authorWithRole: 'author:profiles(id, username, display_name, avatar_url, role)',
  // For threads - explicit FK due to thread_reads ambiguity
  threadAuthorBasic: 'author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url)',

  // Thread with category
  threadWithCategory:
    '*, author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url), category:categories(id, name, slug, parent:parent_id(id, name, slug))',

  // Post with author
  postWithAuthor: '*, author:profiles(id, username, display_name, avatar_url, role)',

  // Category with children
  categoryWithChildren: '*, children:categories!parent_id(*)',
} as const;

/**
 * Check if a record exists.
 */
export async function exists(
  table: string,
  filter: Record<string, unknown>
): Promise<boolean> {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });

  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { count } = await query;
  return (count || 0) > 0;
}

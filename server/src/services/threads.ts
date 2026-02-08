import { supabaseAdmin } from "../config/supabase.js";
import { renderMarkdown } from "../lib/markdown.js";
import { NotFoundError } from "../lib/errors.js";
import { POSTS_PER_PAGE, THREADS_PER_PAGE } from "@bookoflegends/shared";
import type {
  Profile,
  Thread,
  ThreadDetailResponse,
  ThreadListResponse,
} from "@bookoflegends/shared";

/**
 * Service layer for thread-related business logic.
 * Extracts complex operations from route handlers for reusability and testing.
 */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

interface GetThreadOptions {
  threadId: string;
  page: number;
  userId?: string;
  markAsRead?: boolean;
}

interface GetCategoryThreadsOptions {
  categorySlug: string;
  page: number;
  userId?: string;
}

interface GetReactionsResult {
  summaries: Record<string, Record<string, number>>;
  userReactions: Record<string, Array<{ id: string; reaction_type: string }>>;
}

/**
 * Get reaction data for a list of posts.
 */
async function getPostReactions(
  postIds: string[],
  userId?: string,
): Promise<GetReactionsResult> {
  if (!postIds.length) {
    return { summaries: {}, userReactions: {} };
  }

  // Get all reactions for these posts
  const { data: allReactions } = await supabaseAdmin
    .from("post_reactions")
    .select("post_id, reaction_type")
    .in("post_id", postIds);

  // Group reactions by post and type
  const summaries: Record<string, Record<string, number>> = {};
  allReactions?.forEach((r) => {
    if (!summaries[r.post_id]) {
      summaries[r.post_id] = {};
    }
    summaries[r.post_id][r.reaction_type] =
      (summaries[r.post_id][r.reaction_type] || 0) + 1;
  });

  // Get user's reactions if authenticated
  const userReactions: Record<
    string,
    Array<{ id: string; reaction_type: string }>
  > = {};
  if (userId) {
    const { data: reactions } = await supabaseAdmin
      .from("post_reactions")
      .select("id, post_id, reaction_type")
      .eq("user_id", userId)
      .in("post_id", postIds);

    reactions?.forEach((r) => {
      if (!userReactions[r.post_id]) {
        userReactions[r.post_id] = [];
      }
      userReactions[r.post_id].push({
        id: r.id,
        reaction_type: r.reaction_type,
      });
    });
  }

  return { summaries, userReactions };
}

/**
 * Get a thread with its posts, reactions, and subscription status.
 * Also records the read status and increments view count.
 */
export async function getThreadWithPosts(
  options: GetThreadOptions,
): Promise<ThreadDetailResponse & { first_unread_post?: number }> {
  const { threadId, page, userId, markAsRead = true } = options;
  const offset = (page - 1) * POSTS_PER_PAGE;

  // Get thread with author and category
  const { data: thread } = await supabaseAdmin
    .from("threads")
    .select(
      "*, author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url), category:categories(id, name, slug, parent:parent_id(id, name, slug))",
    )
    .eq("id", threadId)
    .single();

  if (!thread) {
    throw new NotFoundError("Thread");
  }

  // Get posts with authors
  const { data: posts, count } = await supabaseAdmin
    .from("posts")
    .select(
      "*, author:profiles(id, username, display_name, avatar_url, role)",
      {
        count: "exact",
      },
    )
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .range(offset, offset + POSTS_PER_PAGE - 1);

  const postIds = posts?.map((p) => p.id) || [];

  // Get reactions
  const { summaries, userReactions } = await getPostReactions(postIds, userId);

  // Attach reactions to posts
  const postsWithReactions = posts?.map((post) => ({
    ...post,
    reactions: summaries[post.id] || {},
    user_reactions: userReactions[post.id] || [],
  }));

  // Check subscription status and get first unread post
  // These queries are wrapped in try-catch to gracefully handle missing tables
  let isSubscribed = false;
  let firstUnreadPost: number | undefined;

  if (userId) {
    // Subscription check - graceful if table missing
    try {
      const { data: subscription } = await supabaseAdmin
        .from("thread_subscriptions")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("user_id", userId)
        .single();
      isSubscribed = !!subscription;
    } catch {
      // Table may not exist yet - subscription features unavailable
    }

    // Read tracking - graceful if table missing
    try {
      const { data: readStatus } = await supabaseAdmin
        .from("thread_reads")
        .select("last_post_number")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .single();

      const lastReadPost = readStatus?.last_post_number || 0;
      if (lastReadPost < (count || 0)) {
        firstUnreadPost = lastReadPost + 1;
      }

      // Record read status and increment view count (fire-and-forget)
      if (markAsRead) {
        recordThreadView(threadId, userId, count || 0).catch(() => {
          // Silently ignore errors - this is non-critical
        });
      }
    } catch {
      // Table may not exist yet - read tracking unavailable
    }
  }

  return {
    thread: { ...thread, is_subscribed: isSubscribed },
    posts: postsWithReactions || [],
    total: count || 0,
    page,
    first_unread_post: firstUnreadPost,
  };
}

/**
 * Record that a user has viewed a thread.
 * Updates read status and increments view count (for unique viewers only).
 */
async function recordThreadView(
  threadId: string,
  userId: string,
  totalPosts: number,
): Promise<void> {
  // Check if user has read this thread before
  const { data: existing } = await supabaseAdmin
    .from("thread_reads")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .single();

  const isFirstView = !existing;

  // Upsert read status
  await supabaseAdmin.from("thread_reads").upsert(
    {
      user_id: userId,
      thread_id: threadId,
      last_read_at: new Date().toISOString(),
      last_post_number: totalPosts,
    },
    { onConflict: "user_id,thread_id" },
  );

  // Increment view count only for first-time viewers
  if (isFirstView) {
    await supabaseAdmin.rpc("increment_view_count", { thread_id: threadId });
  }
}

/**
 * Get threads for a category with pagination and read status.
 */
export async function getCategoryThreads(
  options: GetCategoryThreadsOptions,
): Promise<ThreadListResponse> {
  const { categorySlug, page, userId } = options;
  const offset = (page - 1) * THREADS_PER_PAGE;

  // Get category
  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    throw new NotFoundError("Category");
  }

  const { data: threads, count } = await supabaseAdmin
    .from("threads")
    .select(
      "*, author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url)",
      {
        count: "exact",
      },
    )
    .eq("category_id", category.id)
    .order("is_pinned", { ascending: false })
    .order("last_post_at", { ascending: false })
    .range(offset, offset + THREADS_PER_PAGE - 1);

  // Attach read status if user is authenticated
  const threadsWithReadStatus = await attachReadStatus(threads || [], userId);

  // Type assertion - the shape matches ThreadListResponse after attachReadStatus
  return {
    threads: threadsWithReadStatus as unknown as ThreadListResponse["threads"],
    total: count || 0,
    page,
  };
}

/**
 * Attach read status (has_unread, unread_count) to threads.
 */
async function attachReadStatus(
  threads: Array<Record<string, unknown>>,
  userId?: string,
): Promise<Array<Record<string, unknown>>> {
  if (!userId || !threads.length) {
    // No user - mark everything as not unread (default state)
    return threads.map((t) => ({ ...t, has_unread: false, unread_count: 0 }));
  }

  const threadIds = threads.map((t) => t.id as string);

  // Get read status for all threads
  const { data: reads } = await supabaseAdmin
    .from("thread_reads")
    .select("thread_id, last_post_number")
    .eq("user_id", userId)
    .in("thread_id", threadIds);

  const readMap = new Map(
    reads?.map((r) => [r.thread_id, r.last_post_number]) || [],
  );

  return threads.map((thread) => {
    const lastReadPost = readMap.get(thread.id as string) || 0;
    const postCount = (thread.post_count as number) || 0;
    const unreadCount = Math.max(0, postCount - lastReadPost);

    return {
      ...thread,
      has_unread: unreadCount > 0,
      unread_count: unreadCount,
    };
  });
}

interface CreateThreadOptions {
  categorySlug: string;
  title: string;
  content: string;
  author: Profile;
}

/**
 * Create a new thread with its first post.
 */
export async function createThread(
  options: CreateThreadOptions,
): Promise<Thread> {
  const { categorySlug, title, content, author } = options;

  // Get category
  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    throw new NotFoundError("Category");
  }

  const slug = slugify(title);
  const content_html = renderMarkdown(content);

  // Create thread
  const { data: thread, error: threadError } = await supabaseAdmin
    .from("threads")
    .insert({
      category_id: category.id,
      author_id: author.id,
      title,
      slug,
    })
    .select()
    .single();

  if (threadError || !thread) {
    throw new Error(threadError?.message || "Failed to create thread");
  }

  // Create first post
  const { error: postError } = await supabaseAdmin.from("posts").insert({
    thread_id: thread.id,
    author_id: author.id,
    content,
    content_html,
  });

  if (postError) {
    // Rollback thread creation
    await supabaseAdmin.from("threads").delete().eq("id", thread.id);
    throw new Error(postError.message);
  }

  return thread;
}

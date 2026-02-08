/**
 * Step 4: Recalculate all aggregate counts after import
 *
 * This script:
 * - Updates thread.post_count
 * - Updates thread.last_post_at
 * - Updates category.thread_count and post_count
 * - Updates category.last_post_at
 * - Updates profile.thread_count and post_count
 *
 * Usage: npx tsx scripts/migration/04-recalculate-counts.ts
 */

import '../../server/src/env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function recalculateCounts() {
  console.log('Recalculating aggregate counts...');
  console.log('========================================\n');

  // 1. Update thread post_count and last_post_at
  console.log('1. Updating thread counts...');
  const { error: threadError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE threads t SET
        post_count = (
          SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id
        ),
        last_post_at = COALESCE(
          (SELECT MAX(created_at) FROM posts p WHERE p.thread_id = t.id),
          t.created_at
        ),
        updated_at = NOW();
    `,
  });

  if (threadError) {
    // Fallback: do it the slow way
    console.log('  Using fallback method for threads...');

    // Paginate to get all threads
    const allThreads: { id: string }[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: threads } = await supabase
        .from('threads')
        .select('id')
        .range(offset, offset + PAGE_SIZE - 1);
      if (!threads || threads.length === 0) break;
      allThreads.push(...threads);
      if (threads.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    console.log(`  Found ${allThreads.length} threads to update...`);

    let updated = 0;
    for (const thread of allThreads) {
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      await supabase
        .from('threads')
        .update({
          post_count: count || 0,
          last_post_at: lastPost?.created_at || new Date().toISOString(),
        })
        .eq('id', thread.id);

      updated++;
      if (updated % 200 === 0) {
        console.log(`  Updated ${updated}/${allThreads.length} threads...`);
      }
    }
  }
  console.log('  Thread counts updated');

  // 2. Update category thread_count, post_count, and last_post_at
  console.log('2. Updating category counts...');
  const { error: categoryError } = await supabase.rpc('exec_sql', {
    sql: `
      -- First, update direct counts for each category
      UPDATE categories c SET
        thread_count = (
          SELECT COUNT(*) FROM threads t WHERE t.category_id = c.id
        ),
        post_count = (
          SELECT COUNT(*) FROM posts p
          JOIN threads t ON p.thread_id = t.id
          WHERE t.category_id = c.id
        ),
        last_post_at = (
          SELECT MAX(p.created_at) FROM posts p
          JOIN threads t ON p.thread_id = t.id
          WHERE t.category_id = c.id
        );

      -- Then, update parent categories to include child counts
      UPDATE categories parent SET
        thread_count = parent.thread_count + COALESCE((
          SELECT SUM(thread_count) FROM categories child
          WHERE child.parent_id = parent.id
        ), 0),
        post_count = parent.post_count + COALESCE((
          SELECT SUM(post_count) FROM categories child
          WHERE child.parent_id = parent.id
        ), 0),
        last_post_at = GREATEST(parent.last_post_at, (
          SELECT MAX(last_post_at) FROM categories child
          WHERE child.parent_id = parent.id
        ))
      WHERE parent.parent_id IS NULL;
    `,
  });

  if (categoryError) {
    // Fallback: use post/thread counts we just computed
    console.log('  Using fallback method for categories...');

    const { data: categories } = await supabase
      .from('categories')
      .select('id, parent_id')
      .order('parent_id', { ascending: true, nullsFirst: true });

    if (categories) {
      console.log(`  Found ${categories.length} categories to update...`);

      // First pass: update direct counts (use count queries, much faster)
      let updated = 0;
      for (const category of categories) {
        const { count: threadCount } = await supabase
          .from('threads')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);

        // Use a single query to get post count and last_post_at via threads
        const { data: threads } = await supabase
          .from('threads')
          .select('id, post_count, last_post_at')
          .eq('category_id', category.id);

        const postCount = (threads || []).reduce((sum, t) => sum + (t.post_count || 0), 0);
        const lastPostAt = (threads || []).reduce((max, t) => {
          if (!t.last_post_at) return max;
          if (!max) return t.last_post_at;
          return t.last_post_at > max ? t.last_post_at : max;
        }, null as string | null);

        await supabase
          .from('categories')
          .update({
            thread_count: threadCount || 0,
            post_count: postCount,
            last_post_at: lastPostAt,
          })
          .eq('id', category.id);

        updated++;
        if (updated % 20 === 0) {
          console.log(`  Updated ${updated}/${categories.length} categories...`);
        }
      }

      // Second pass: update parent counts with child counts
      console.log('  Updating parent category totals...');
      const parents = categories.filter((c) => c.parent_id === null);
      for (const parent of parents) {
        const { data: children } = await supabase
          .from('categories')
          .select('thread_count, post_count, last_post_at')
          .eq('parent_id', parent.id);

        if (children && children.length > 0) {
          const { data: parentData } = await supabase
            .from('categories')
            .select('thread_count, post_count, last_post_at')
            .eq('id', parent.id)
            .single();

          if (parentData) {
            const totalThreads = parentData.thread_count + children.reduce((sum, c) => sum + (c.thread_count || 0), 0);
            const totalPosts = parentData.post_count + children.reduce((sum, c) => sum + (c.post_count || 0), 0);
            const childLastPost = children.reduce((max, c) => {
              if (!c.last_post_at) return max;
              if (!max) return c.last_post_at;
              return c.last_post_at > max ? c.last_post_at : max;
            }, null as string | null);

            const lastPost = parentData.last_post_at && childLastPost
              ? (parentData.last_post_at > childLastPost ? parentData.last_post_at : childLastPost)
              : parentData.last_post_at || childLastPost;

            await supabase
              .from('categories')
              .update({
                thread_count: totalThreads,
                post_count: totalPosts,
                last_post_at: lastPost,
              })
              .eq('id', parent.id);
          }
        }
      }
    }
  }
  console.log('  Category counts updated');

  // 3. Update profile thread_count and post_count
  console.log('3. Updating profile counts...');
  const { error: profileError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE profiles p SET
        thread_count = (
          SELECT COUNT(*) FROM threads t WHERE t.author_id = p.id
        ),
        post_count = (
          SELECT COUNT(*) FROM posts po WHERE po.author_id = p.id
        ),
        updated_at = NOW();
    `,
  });

  if (profileError) {
    // Fallback: do it the slow way
    console.log('  Using fallback method for profiles...');

    const { data: profiles } = await supabase.from('profiles').select('id');

    if (profiles) {
      let updated = 0;
      for (const profile of profiles) {
        const { count: threadCount } = await supabase
          .from('threads')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', profile.id);

        const { count: postCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', profile.id);

        await supabase
          .from('profiles')
          .update({
            thread_count: threadCount || 0,
            post_count: postCount || 0,
          })
          .eq('id', profile.id);

        updated++;
        if (updated % 100 === 0) {
          console.log(`  Updated ${updated}/${profiles.length} profiles...`);
        }
      }
    }
  }
  console.log('  Profile counts updated');

  console.log('\n========================================');
  console.log('Count recalculation complete!');
  console.log('========================================');
  console.log('\nNext step: npx tsx scripts/migration/05-verify-migration.ts');
}

recalculateCounts().catch((err) => {
  console.error('Count recalculation failed:', err);
  process.exit(1);
});

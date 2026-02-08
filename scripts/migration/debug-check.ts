/**
 * Debug script - check what's in Supabase and transformed data
 */

import '../../server/src/env.js';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debug() {
  console.log('=== Supabase Current State ===\n');

  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: categoryCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  const { count: threadCount } = await supabase.from('threads').select('*', { count: 'exact', head: true });
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });

  console.log(`Profiles:   ${profileCount}`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Threads:    ${threadCount}`);
  console.log(`Posts:      ${postCount}`);

  console.log('\n=== Transformed Data ===\n');

  const files = ['transformed-users.json', 'transformed-categories.json', 'transformed-threads.json', 'transformed-posts.json'];
  for (const file of files) {
    const path = join(DATA_DIR, file);
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      console.log(`${file}: ${data.length} records`);
    } else {
      console.log(`${file}: NOT FOUND`);
    }
  }

  // Check for orphaned references in transformed data
  console.log('\n=== Checking for Orphaned References ===\n');

  const threads = JSON.parse(readFileSync(join(DATA_DIR, 'transformed-threads.json'), 'utf-8'));
  const posts = JSON.parse(readFileSync(join(DATA_DIR, 'transformed-posts.json'), 'utf-8'));
  const users = JSON.parse(readFileSync(join(DATA_DIR, 'transformed-users.json'), 'utf-8'));
  const categories = JSON.parse(readFileSync(join(DATA_DIR, 'transformed-categories.json'), 'utf-8'));

  const userIds = new Set(users.map((u: any) => u.new_uuid));
  const categoryIds = new Set(categories.map((c: any) => c.new_uuid));
  const threadIds = new Set(threads.map((t: any) => t.new_uuid));

  // Check threads for missing authors/categories
  let threadsWithMissingAuthor = 0;
  let threadsWithMissingCategory = 0;
  for (const thread of threads) {
    if (!userIds.has(thread.author_id)) threadsWithMissingAuthor++;
    if (!categoryIds.has(thread.category_id)) threadsWithMissingCategory++;
  }
  console.log(`Threads with missing author: ${threadsWithMissingAuthor}`);
  console.log(`Threads with missing category: ${threadsWithMissingCategory}`);

  // Check posts for missing threads/authors
  let postsWithMissingThread = 0;
  let postsWithMissingAuthor = 0;
  for (const post of posts) {
    if (!threadIds.has(post.thread_id)) postsWithMissingThread++;
    if (!userIds.has(post.author_id)) postsWithMissingAuthor++;
  }
  console.log(`Posts with missing thread: ${postsWithMissingThread}`);
  console.log(`Posts with missing author: ${postsWithMissingAuthor}`);

  // Check what's actually in Supabase threads table
  if (threadCount === 0) {
    console.log('\n⚠️  No threads in Supabase! Thread import may have failed.');

    // Check if there were category issues
    const { data: dbCategories } = await supabase.from('categories').select('id');
    const dbCategoryIds = new Set((dbCategories || []).map((c: any) => c.id));

    let threadsWithMissingDbCategory = 0;
    for (const thread of threads) {
      if (!dbCategoryIds.has(thread.category_id)) threadsWithMissingDbCategory++;
    }
    console.log(`Threads referencing non-existent DB categories: ${threadsWithMissingDbCategory}`);
  }
}

debug().catch(console.error);

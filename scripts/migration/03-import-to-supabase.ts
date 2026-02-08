/**
 * Step 3: Import transformed data into Supabase
 *
 * This script:
 * - Creates auth users (with random passwords - requires password reset)
 * - Updates auto-created profiles with migrated data
 * - Imports categories (parents first, then children)
 * - Imports threads
 * - Imports posts
 *
 * IMPORTANT: This uses the service role key to bypass RLS
 *
 * Usage: npx tsx scripts/migration/03-import-to-supabase.ts
 */

import '../../server/src/env.js';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
import type {
  TransformedUser,
  TransformedCategory,
  TransformedThread,
  TransformedPost,
} from './lib/types.js';

const DATA_DIR = join(__dirname, 'data');
const BATCH_SIZE = 100;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function loadJsonFile<T>(filename: string): T[] {
  const path = join(DATA_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function disableTriggers() {
  console.log('Disabling triggers for bulk import...');

  // Note: This requires the service role to have sufficient permissions
  // If this fails, the import will still work but may be slower
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE threads DISABLE TRIGGER ALL;
        ALTER TABLE posts DISABLE TRIGGER ALL;
        ALTER TABLE categories DISABLE TRIGGER ALL;
        ALTER TABLE profiles DISABLE TRIGGER ALL;
      `,
    });
    console.log('  Triggers disabled');
    return true;
  } catch {
    console.log('  Could not disable triggers (this is OK, import will still work)');
    return false;
  }
}

async function enableTriggers() {
  console.log('Re-enabling triggers...');
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE threads ENABLE TRIGGER ALL;
        ALTER TABLE posts ENABLE TRIGGER ALL;
        ALTER TABLE categories ENABLE TRIGGER ALL;
        ALTER TABLE profiles ENABLE TRIGGER ALL;
      `,
    });
    console.log('  Triggers enabled');
  } catch {
    console.log('  Could not re-enable triggers (you may need to do this manually)');
  }
}

// Maps transform-generated UUID to actual Supabase UUID
type UserIdMap = Map<string, string>;

async function importUsers(users: TransformedUser[]): Promise<UserIdMap> {
  console.log(`\nImporting ${users.length} users...`);

  // Map from transform UUID (new_uuid) to actual Supabase UUID
  const transformToSupabase = new Map<string, string>();
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Generate random password (user will need to reset)
      const tempPassword = randomBytes(32).toString('hex');

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          migrated_from_vanilla: true,
          vanilla_user_id: user.vanilla_id,
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already exists') || authError.message.includes('duplicate') || authError.message.includes('already been registered')) {
          // Try to find existing user
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((u) => u.email === user.email);
          if (existing) {
            // Map the transform UUID to the existing Supabase UUID
            transformToSupabase.set(user.new_uuid, existing.id);
            console.log(`  Mapped existing user ${user.email} -> ${existing.id}`);
            skipped++;
            continue;
          }
        }
        console.error(`  Error creating user ${user.email}: ${authError.message}`);
        errors++;
        continue;
      }

      const authUserId = authUser.user.id;
      // Map the transform UUID to the actual Supabase UUID
      transformToSupabase.set(user.new_uuid, authUserId);

      // Update auto-created profile with migrated data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.created_at,
          post_count: 0,
          thread_count: 0,
        })
        .eq('id', authUserId);

      if (profileError) {
        console.error(`  Error updating profile for ${user.email}: ${profileError.message}`);
      }

      created++;

      if (created % 50 === 0) {
        console.log(`  Created ${created}/${users.length} users...`);
      }
    } catch (err) {
      console.error(`  Unexpected error for user ${user.email}:`, err);
      errors++;
    }
  }

  console.log(`  Users: ${created} created, ${skipped} skipped, ${errors} errors`);
  console.log(`  User ID mappings: ${transformToSupabase.size}`);
  return transformToSupabase;
}

async function importCategories(categories: TransformedCategory[]): Promise<void> {
  console.log(`\nImporting ${categories.length} categories...`);

  // Import parent categories first (parent_id is null)
  const parents = categories.filter((c) => c.parent_id === null);
  const children = categories.filter((c) => c.parent_id !== null);

  console.log(`  Importing ${parents.length} parent categories...`);

  let parentSuccess = 0;
  let parentErrors = 0;

  // Insert parents one by one to identify problem categories
  for (const cat of parents) {
    const { error } = await supabase.from('categories').insert({
      id: cat.new_uuid,
      name: cat.name,
      description: cat.description,
      slug: cat.slug,
      sort_order: cat.sort_order,
      parent_id: null,
      thread_count: 0,
      post_count: 0,
      created_at: cat.created_at,
    });

    if (error) {
      console.error(`  Error inserting category "${cat.name}" (slug: ${cat.slug}): ${error.message}`);
      parentErrors++;
    } else {
      parentSuccess++;
    }
  }
  console.log(`  Parent categories: ${parentSuccess} success, ${parentErrors} errors`);

  console.log(`  Importing ${children.length} child categories...`);

  let childSuccess = 0;
  let childErrors = 0;

  // Check which parent_ids exist in DB
  const { data: dbParents } = await supabase.from('categories').select('id');
  const dbParentIds = new Set((dbParents || []).map((p) => p.id));

  for (const cat of children) {
    // Skip if parent doesn't exist
    if (!dbParentIds.has(cat.parent_id!)) {
      console.error(`  Skipping "${cat.name}" - parent ${cat.parent_id} not in DB`);
      childErrors++;
      continue;
    }

    const { error } = await supabase.from('categories').insert({
      id: cat.new_uuid,
      name: cat.name,
      description: cat.description,
      slug: cat.slug,
      sort_order: cat.sort_order,
      parent_id: cat.parent_id,
      thread_count: 0,
      post_count: 0,
      created_at: cat.created_at,
    });

    if (error) {
      console.error(`  Error inserting child "${cat.name}" (slug: ${cat.slug}): ${error.message}`);
      childErrors++;
    } else {
      childSuccess++;
    }
  }
  console.log(`  Child categories: ${childSuccess} success, ${childErrors} errors`);

  const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  console.log(`  Total categories in DB: ${count}`);
}

async function importThreads(
  threads: TransformedThread[],
  userIdMap: UserIdMap,
  categoryIds: Set<string>
): Promise<void> {
  console.log(`\nImporting ${threads.length} threads...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < threads.length; i += BATCH_SIZE) {
    const batch: any[] = [];

    for (const t of threads.slice(i, i + BATCH_SIZE)) {
      // Map author_id from transform UUID to actual Supabase UUID
      const actualAuthorId = userIdMap.get(t.author_id);
      if (!actualAuthorId) {
        skipped++;
        continue;
      }

      // Skip if category doesn't exist
      if (!categoryIds.has(t.category_id)) {
        skipped++;
        continue;
      }

      batch.push({
        id: t.new_uuid,
        category_id: t.category_id,
        author_id: actualAuthorId,
        title: t.title,
        slug: t.slug,
        is_pinned: t.is_pinned,
        is_locked: t.is_locked,
        post_count: 0,
        last_post_at: t.last_post_at,
        created_at: t.created_at,
        updated_at: t.updated_at,
      });
    }

    if (batch.length > 0) {
      const { error } = await supabase.from('threads').insert(batch);
      if (error) {
        console.error(`  Error inserting threads batch:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= threads.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, threads.length)}/${threads.length} threads...`);
    }
  }

  console.log(`  Threads: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function importPosts(
  posts: TransformedPost[],
  userIdMap: UserIdMap,
  threadIds: Set<string>
): Promise<void> {
  console.log(`\nImporting ${posts.length} posts...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Sort posts by created_at to maintain order
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (let i = 0; i < sortedPosts.length; i += BATCH_SIZE) {
    const batch: any[] = [];

    for (const p of sortedPosts.slice(i, i + BATCH_SIZE)) {
      // Map author_id from transform UUID to actual Supabase UUID
      const actualAuthorId = userIdMap.get(p.author_id);
      if (!actualAuthorId) {
        skipped++;
        continue;
      }

      // Skip if thread doesn't exist
      if (!threadIds.has(p.thread_id)) {
        skipped++;
        continue;
      }

      batch.push({
        id: p.new_uuid,
        thread_id: p.thread_id,
        author_id: actualAuthorId,
        content: p.content,
        content_html: p.content_html,
        is_edited: p.is_edited,
        reaction_count: 0,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    }

    if (batch.length > 0) {
      const { error } = await supabase.from('posts').insert(batch);
      if (error) {
        console.error(`  Error inserting posts batch:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= sortedPosts.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, sortedPosts.length)}/${sortedPosts.length} posts...`);
    }
  }

  console.log(`  Posts: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

async function runImport() {
  console.log('Starting import to Supabase...');
  console.log('========================================\n');

  // Load transformed data
  const users = loadJsonFile<TransformedUser>('transformed-users.json');
  const categories = loadJsonFile<TransformedCategory>('transformed-categories.json');
  const threads = loadJsonFile<TransformedThread>('transformed-threads.json');
  const posts = loadJsonFile<TransformedPost>('transformed-posts.json');

  console.log('Data to import:');
  console.log(`  Users:      ${users.length}`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Threads:    ${threads.length}`);
  console.log(`  Posts:      ${posts.length}`);

  // Try to disable triggers for faster import
  const triggersDisabled = await disableTriggers();

  try {
    // Import in order (respecting FK dependencies)

    // 1. Import users and get the transform UUID -> Supabase UUID mapping
    const userIdMap = await importUsers(users);

    // 2. Import categories
    await importCategories(categories);

    // 3. Get category IDs that actually exist in DB
    const { data: dbCategories } = await supabase.from('categories').select('id');
    const categoryIds = new Set((dbCategories || []).map((c) => c.id));
    console.log(`  Categories in DB: ${categoryIds.size}`);

    // 4. Import threads with user ID mapping and category validation
    await importThreads(threads, userIdMap, categoryIds);

    // 5. Get thread IDs that actually exist in DB (paginate to get all)
    const threadIds = new Set<string>();
    let threadOffset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: dbThreads } = await supabase
        .from('threads')
        .select('id')
        .range(threadOffset, threadOffset + PAGE_SIZE - 1);
      if (!dbThreads || dbThreads.length === 0) break;
      for (const t of dbThreads) threadIds.add(t.id);
      if (dbThreads.length < PAGE_SIZE) break;
      threadOffset += PAGE_SIZE;
    }
    console.log(`  Threads in DB: ${threadIds.size}`);

    // 6. Import posts with user ID mapping and thread validation
    await importPosts(posts, userIdMap, threadIds);
  } finally {
    // Re-enable triggers
    if (triggersDisabled) {
      await enableTriggers();
    }
  }

  console.log('\n========================================');
  console.log('Import complete!');
  console.log('========================================');
  console.log('\nNext step: npx tsx scripts/migration/04-recalculate-counts.ts');
}

runImport().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

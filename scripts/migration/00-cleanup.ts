/**
 * Cleanup script - removes all migrated data from Supabase
 * Run this before re-running the migration
 *
 * Usage: npx tsx scripts/migration/00-cleanup.ts
 */

import '../../server/src/env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function cleanup() {
  console.log('Cleaning up migrated data...');
  console.log('========================================\n');

  // 1. Delete posts (no cascade needed, they're leaf nodes)
  console.log('1. Deleting posts...');
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });
  console.log(`   Found ${postCount || 0} posts`);

  if (postCount && postCount > 0) {
    const { error: postError } = await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (postError) console.error('   Error:', postError.message);
    else console.log('   Deleted all posts');
  }

  // 2. Delete threads
  console.log('2. Deleting threads...');
  const { count: threadCount } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true });
  console.log(`   Found ${threadCount || 0} threads`);

  if (threadCount && threadCount > 0) {
    const { error: threadError } = await supabase.from('threads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (threadError) console.error('   Error:', threadError.message);
    else console.log('   Deleted all threads');
  }

  // 3. Delete categories
  console.log('3. Deleting categories...');
  const { count: categoryCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });
  console.log(`   Found ${categoryCount || 0} categories`);

  if (categoryCount && categoryCount > 0) {
    // Delete children first, then parents
    const { error: childError } = await supabase.from('categories').delete().not('parent_id', 'is', null);
    if (childError) console.error('   Error deleting child categories:', childError.message);

    const { error: parentError } = await supabase.from('categories').delete().is('parent_id', null);
    if (parentError) console.error('   Error deleting parent categories:', parentError.message);
    else console.log('   Deleted all categories');
  }

  // 4. Delete ALL auth users except your admin account
  console.log('4. Deleting auth users...');
  const { data: users } = await supabase.auth.admin.listUsers();
  // Keep only your personal admin account
  const KEEP_EMAILS = ['trustbrendan@gmail.com']; // Add any emails to preserve
  const usersToDelete = users?.users?.filter(
    (u) => !KEEP_EMAILS.includes(u.email || '')
  ) || [];
  console.log(`   Found ${usersToDelete.length} users to delete (keeping ${KEEP_EMAILS.join(', ')})`);

  let deleted = 0;
  for (const user of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`   Error deleting user ${user.email}:`, error.message);
    } else {
      deleted++;
      if (deleted % 50 === 0) console.log(`   Deleted ${deleted}/${usersToDelete.length}...`);
    }
  }
  console.log(`   Deleted ${deleted} users`);

  // 5. Clear ID mappings
  console.log('5. Clearing ID mappings...');
  const { unlinkSync, existsSync } = await import('fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const mappingsFile = join(__dirname, 'data', 'id-mappings.json');

  if (existsSync(mappingsFile)) {
    unlinkSync(mappingsFile);
    console.log('   Cleared id-mappings.json');
  } else {
    console.log('   No mappings file found');
  }

  console.log('\n========================================');
  console.log('Cleanup complete!');
  console.log('========================================');
  console.log('\nYou can now re-run the migration:');
  console.log('  npx tsx scripts/migration/01-export-vanilla.ts');
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

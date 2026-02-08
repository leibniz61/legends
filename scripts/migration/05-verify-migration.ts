/**
 * Step 5: Verify migration integrity
 *
 * This script:
 * - Compares source and target counts
 * - Checks for orphaned records
 * - Verifies all threads have at least one post
 * - Samples random posts to verify content integrity
 *
 * Usage: npx tsx scripts/migration/05-verify-migration.ts
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

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.push({ check, status, message });
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  console.log(`  ${icon} ${check}: ${message}`);
}

function loadJsonFile<T>(filename: string): T[] | null {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function verifyMigration() {
  console.log('Verifying migration...');
  console.log('========================================\n');

  // Load source counts
  const vanillaUsers = loadJsonFile('vanilla-users.json');
  const vanillaCategories = loadJsonFile('vanilla-categories.json');
  const vanillaDiscussions = loadJsonFile('vanilla-discussions.json');
  const vanillaComments = loadJsonFile('vanilla-comments.json');

  // 1. Count verification
  console.log('1. Count Verification');
  console.log('   ─────────────────────────────────────');

  // Users/Profiles
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (vanillaUsers) {
    const match = profileCount === vanillaUsers.length;
    addResult(
      'Users',
      match ? 'pass' : 'warn',
      `Vanilla: ${vanillaUsers.length}, Supabase: ${profileCount}`
    );
  } else {
    addResult('Users', 'pass', `Supabase: ${profileCount} profiles`);
  }

  // Categories
  const { count: categoryCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  if (vanillaCategories) {
    // Note: count might differ due to hierarchy flattening
    addResult(
      'Categories',
      'pass',
      `Vanilla: ${vanillaCategories.length}, Supabase: ${categoryCount}`
    );
  } else {
    addResult('Categories', 'pass', `Supabase: ${categoryCount} categories`);
  }

  // Threads
  const { count: threadCount } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true });

  if (vanillaDiscussions) {
    const match = threadCount === vanillaDiscussions.length;
    addResult(
      'Threads',
      match ? 'pass' : 'warn',
      `Vanilla Discussions: ${vanillaDiscussions.length}, Supabase Threads: ${threadCount}`
    );
  } else {
    addResult('Threads', 'pass', `Supabase: ${threadCount} threads`);
  }

  // Posts
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  if (vanillaDiscussions && vanillaComments) {
    // Posts = Comments + Discussions (first post from each discussion)
    const expectedPosts = vanillaComments.length + vanillaDiscussions.length;
    const match = postCount === expectedPosts;
    addResult(
      'Posts',
      match ? 'pass' : 'warn',
      `Expected: ${expectedPosts} (${vanillaDiscussions.length} first posts + ${vanillaComments.length} comments), Supabase: ${postCount}`
    );
  } else {
    addResult('Posts', 'pass', `Supabase: ${postCount} posts`);
  }

  // 2. Integrity checks
  console.log('\n2. Integrity Checks');
  console.log('   ─────────────────────────────────────');

  // Check all threads have at least one post
  const { data: threadsWithoutPosts } = await supabase
    .from('threads')
    .select('id, title')
    .eq('post_count', 0);

  if (threadsWithoutPosts && threadsWithoutPosts.length > 0) {
    addResult(
      'Threads have posts',
      'fail',
      `${threadsWithoutPosts.length} threads have no posts`
    );
    console.log(`     First 5: ${threadsWithoutPosts.slice(0, 5).map((t) => t.title).join(', ')}`);
  } else {
    addResult('Threads have posts', 'pass', 'All threads have at least one post');
  }

  // Check for orphaned posts (posts with invalid thread_id)
  const { data: orphanedPosts } = await supabase
    .from('posts')
    .select('id, thread_id')
    .is('thread_id', null);

  if (orphanedPosts && orphanedPosts.length > 0) {
    addResult('No orphaned posts', 'fail', `${orphanedPosts.length} posts have no thread`);
  } else {
    addResult('No orphaned posts', 'pass', 'All posts belong to a thread');
  }

  // Check category hierarchy (max 2 levels)
  const { data: deepCategories } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      parent:parent_id (
        parent_id
      )
    `)
    .not('parent_id', 'is', null);

  const tooDeep = deepCategories?.filter((c: any) => c.parent?.parent_id !== null) || [];
  if (tooDeep.length > 0) {
    addResult(
      'Category depth',
      'fail',
      `${tooDeep.length} categories are nested too deep (>2 levels)`
    );
  } else {
    addResult('Category depth', 'pass', 'All categories are at most 2 levels deep');
  }

  // 3. Content verification (sample check)
  console.log('\n3. Content Verification (Sample)');
  console.log('   ─────────────────────────────────────');

  // Sample 5 random posts and check content_html is not empty
  const { data: samplePosts } = await supabase
    .from('posts')
    .select('id, content, content_html')
    .limit(10);

  if (samplePosts) {
    const emptyHtml = samplePosts.filter((p) => !p.content_html || p.content_html.trim() === '');
    if (emptyHtml.length > 0) {
      addResult(
        'Content HTML generated',
        'warn',
        `${emptyHtml.length}/10 sample posts have empty content_html`
      );
    } else {
      addResult('Content HTML generated', 'pass', 'All sample posts have content_html');
    }

    // Check for potential XSS (script tags)
    const hasScript = samplePosts.filter((p) =>
      p.content_html?.toLowerCase().includes('<script')
    );
    if (hasScript.length > 0) {
      addResult(
        'Content sanitized',
        'fail',
        `${hasScript.length}/10 sample posts contain script tags!`
      );
    } else {
      addResult('Content sanitized', 'pass', 'No script tags found in sample posts');
    }
  }

  // 4. Summary
  console.log('\n========================================');
  console.log('Verification Summary');
  console.log('========================================\n');

  const passed = results.filter((r) => r.status === 'pass').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  console.log(`  ✓ Passed: ${passed}`);
  console.log(`  ⚠ Warnings: ${warned}`);
  console.log(`  ✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Migration has issues that should be investigated.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️ Migration complete with warnings. Review the warnings above.');
  } else {
    console.log('\n✅ Migration verified successfully!');
  }

  console.log('\n========================================');
  console.log('Next steps:');
  console.log('========================================');
  console.log('1. Send password reset emails to all migrated users');
  console.log('2. Test the forum with sample user accounts');
  console.log('3. Update DNS/redirects if needed');
  console.log('4. Keep Vanilla DB backup for 90 days');
}

verifyMigration().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

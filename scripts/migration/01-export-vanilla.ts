/**
 * Step 1: Export data from Vanilla Forums MySQL database
 *
 * Prerequisites:
 * - Add to .env:
 *   VANILLA_DB_HOST=your-do-mysql-host
 *   VANILLA_DB_USER=your-user
 *   VANILLA_DB_PASSWORD=your-password
 *   VANILLA_DB_NAME=your-vanilla-db
 *
 * Usage: npx tsx scripts/migration/01-export-vanilla.ts
 */

import '../../server/src/env.js';
import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

async function exportVanilla() {
  console.log('Connecting to Vanilla Forums database...');

  const connection = await mysql.createConnection({
    host: process.env.VANILLA_DB_HOST,
    user: process.env.VANILLA_DB_USER,
    password: process.env.VANILLA_DB_PASSWORD,
    database: process.env.VANILLA_DB_NAME,
    ssl: process.env.VANILLA_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  console.log('Connected! Starting export...\n');

  // Export Users (only those who have posted - filters out spam accounts)
  console.log('Exporting users (filtering to only those with posts)...');
  const [users] = await connection.execute(`
    SELECT
      UserID,
      Name as username,
      Email as email,
      Photo as avatar_url,
      About as bio,
      DateInserted as created_at,
      Admin as is_admin
    FROM GDN_User
    WHERE (Deleted = 0 OR Deleted IS NULL)
      AND (
        UserID IN (SELECT DISTINCT InsertUserID FROM GDN_Discussion)
        OR UserID IN (SELECT DISTINCT InsertUserID FROM GDN_Comment)
      )
  `);
  writeFileSync(join(DATA_DIR, 'vanilla-users.json'), JSON.stringify(users, null, 2));
  console.log(`  Exported ${(users as any[]).length} users`);

  // Export Categories
  console.log('Exporting categories...');
  const [categories] = await connection.execute(`
    SELECT
      CategoryID,
      ParentCategoryID,
      Name,
      Description,
      UrlCode as slug,
      Sort as sort_order,
      Depth
    FROM GDN_Category
    WHERE CategoryID > 0
    ORDER BY Depth ASC, Sort ASC
  `);
  writeFileSync(join(DATA_DIR, 'vanilla-categories.json'), JSON.stringify(categories, null, 2));
  console.log(`  Exported ${(categories as any[]).length} categories`);

  // Export Discussions (threads)
  console.log('Exporting discussions...');
  const [discussions] = await connection.execute(`
    SELECT
      DiscussionID,
      CategoryID,
      InsertUserID as author_id,
      Name as title,
      Body,
      Format,
      Announce as is_pinned,
      Closed as is_locked,
      DateInserted,
      DateLastComment
    FROM GDN_Discussion
    ORDER BY DateInserted ASC
  `);
  writeFileSync(join(DATA_DIR, 'vanilla-discussions.json'), JSON.stringify(discussions, null, 2));
  console.log(`  Exported ${(discussions as any[]).length} discussions`);

  // Export Comments (posts)
  console.log('Exporting comments...');
  const [comments] = await connection.execute(`
    SELECT
      CommentID,
      DiscussionID as thread_id,
      InsertUserID as author_id,
      Body,
      Format,
      DateInserted,
      DateUpdated
    FROM GDN_Comment
    ORDER BY DateInserted ASC
  `);
  writeFileSync(join(DATA_DIR, 'vanilla-comments.json'), JSON.stringify(comments, null, 2));
  console.log(`  Exported ${(comments as any[]).length} comments`);

  await connection.end();

  console.log('\n========================================');
  console.log('Export complete! Files saved to scripts/migration/data/');
  console.log('========================================');
  console.log('\nSummary:');
  console.log(`  Users:       ${(users as any[]).length}`);
  console.log(`  Categories:  ${(categories as any[]).length}`);
  console.log(`  Discussions: ${(discussions as any[]).length}`);
  console.log(`  Comments:    ${(comments as any[]).length}`);
  console.log(`  Total posts: ${(discussions as any[]).length + (comments as any[]).length}`);
  console.log('\nNext step: npx tsx scripts/migration/02-transform-data.ts');
}

exportVanilla().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});

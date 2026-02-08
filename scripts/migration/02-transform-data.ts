/**
 * Step 2: Transform Vanilla Forums data for Book of Legends
 *
 * This script:
 * - Converts integer IDs to UUIDs
 * - Flattens category hierarchy to max 2 levels
 * - Converts content formats (HTML/BBCode) to Markdown
 * - Generates content_html from Markdown
 * - Converts Discussions to Threads + First Post
 *
 * Usage: npx tsx scripts/migration/02-transform-data.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  loadMappings,
  saveMappings,
  mapId,
  generateUniqueSlug,
} from './lib/id-mapper.js';
import { convertContent } from './lib/content-converter.js';
import type {
  VanillaUser,
  VanillaCategory,
  VanillaDiscussion,
  VanillaComment,
  TransformedUser,
  TransformedCategory,
  TransformedThread,
  TransformedPost,
  IdMappings,
} from './lib/types.js';

const DATA_DIR = join(__dirname, 'data');

// Validation limits from shared/constants
const MAX_USERNAME_LENGTH = 30;
const MIN_USERNAME_LENGTH = 3;
const MAX_BIO_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;

function loadJsonFile<T>(filename: string): T[] {
  const path = join(DATA_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveJsonFile(filename: string, data: unknown): void {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

function sanitizeUsername(username: string): string {
  // Remove invalid characters, ensure length limits
  let clean = username
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, MAX_USERNAME_LENGTH);

  if (clean.length < MIN_USERNAME_LENGTH) {
    clean = clean.padEnd(MIN_USERNAME_LENGTH, '_');
  }

  return clean;
}

function transformUsers(
  vanillaUsers: VanillaUser[],
  mappings: IdMappings
): TransformedUser[] {
  console.log('Transforming users...');
  const usedUsernames = new Set<string>();

  return vanillaUsers.map((user) => {
    let username = sanitizeUsername(user.username);

    // Ensure unique username
    let counter = 1;
    let uniqueUsername = username;
    while (usedUsernames.has(uniqueUsername.toLowerCase())) {
      uniqueUsername = `${username}${counter}`;
      counter++;
    }
    usedUsernames.add(uniqueUsername.toLowerCase());

    return {
      vanilla_id: user.UserID,
      new_uuid: mapId(mappings, 'users', user.UserID),
      email: user.email,
      username: uniqueUsername,
      display_name: user.username !== uniqueUsername ? user.username : null,
      avatar_url: user.avatar_url,
      bio: user.bio?.slice(0, MAX_BIO_LENGTH) || null,
      role: user.is_admin ? 'admin' : 'user',
      created_at: new Date(user.created_at).toISOString(),
    };
  });
}

function transformCategories(
  vanillaCategories: VanillaCategory[],
  mappings: IdMappings
): TransformedCategory[] {
  console.log('Transforming categories...');

  // Build lookup maps
  const byId = new Map(vanillaCategories.map((c) => [c.CategoryID, c]));
  const usedSlugs = new Set<string>();

  // Find "Stories of Old" - this is an archive container we'll skip
  const storiesOfOld = vanillaCategories.find((c) => c.Name === 'Stories of Old');
  const storiesOfOldId = storiesOfOld?.CategoryID;

  console.log(`  Found "Stories of Old" archive (ID: ${storiesOfOldId}) - promoting its children`);

  // Get the full ancestor chain for a category
  function getAncestorChain(catId: number): VanillaCategory[] {
    const chain: VanillaCategory[] = [];
    let current = byId.get(catId);
    while (current) {
      chain.unshift(current);
      if (current.ParentCategoryID && current.ParentCategoryID > 0) {
        current = byId.get(current.ParentCategoryID);
      } else {
        break;
      }
    }
    return chain;
  }

  // Determine the effective depth and parent for a category
  // - Skip "Stories of Old" in the chain
  // - Flatten to max 2 levels (parent + child)
  function getEffectivePosition(cat: VanillaCategory): {
    effectiveDepth: number;
    effectiveParentId: number | null;
    namePrefix: string[];
  } {
    const chain = getAncestorChain(cat.CategoryID);

    // Remove "Stories of Old" from chain if present
    const filteredChain = chain.filter((c) => c.CategoryID !== storiesOfOldId);

    if (filteredChain.length === 0) {
      // This is "Stories of Old" itself - skip it
      return { effectiveDepth: -1, effectiveParentId: null, namePrefix: [] };
    }

    // effectiveDepth: 0 = top level, 1 = subcategory
    const effectiveDepth = Math.min(filteredChain.length - 1, 1);

    // Parent is the first category in the filtered chain (if we're not it)
    let effectiveParentId: number | null = null;
    if (filteredChain.length > 1) {
      effectiveParentId = filteredChain[0].CategoryID;
    }

    // Name prefix: if depth > 1 in filtered chain, we need to flatten names
    // e.g., chain is [A, B, C, D] -> D becomes child of A named "B - C - D"
    const namePrefix: string[] = [];
    if (filteredChain.length > 2) {
      // Skip first (parent) and last (self), collect middle names
      for (let i = 1; i < filteredChain.length - 1; i++) {
        namePrefix.push(filteredChain[i].Name);
      }
    }

    return { effectiveDepth, effectiveParentId, namePrefix };
  }

  const transformed: TransformedCategory[] = [];

  // Sort by original depth to ensure parents are processed before children
  const sorted = [...vanillaCategories].sort((a, b) => a.Depth - b.Depth);

  for (const cat of sorted) {
    const { effectiveDepth, effectiveParentId, namePrefix } = getEffectivePosition(cat);

    // Skip "Stories of Old" itself
    if (effectiveDepth < 0) {
      console.log(`  Skipping archive category: ${cat.Name}`);
      continue;
    }

    const uuid = mapId(mappings, 'categories', cat.CategoryID);

    // Build the full name with prefix if needed
    let fullName = cat.Name;
    if (namePrefix.length > 0) {
      fullName = [...namePrefix, cat.Name].join(' - ');
    }

    // Get parent UUID
    let parentUuid: string | null = null;
    if (effectiveParentId) {
      parentUuid = mappings.categories[effectiveParentId] || null;
    }

    const slug = generateUniqueSlug(cat.slug || fullName, usedSlugs);

    transformed.push({
      vanilla_id: cat.CategoryID,
      new_uuid: uuid,
      name: fullName,
      description: cat.Description,
      slug,
      sort_order: cat.sort_order,
      parent_id: parentUuid,
      created_at: new Date().toISOString(),
    });
  }

  // Log summary
  const topLevel = transformed.filter((c) => c.parent_id === null);
  const subCats = transformed.filter((c) => c.parent_id !== null);
  console.log(`  Top-level categories: ${topLevel.length}`);
  console.log(`  Sub-categories: ${subCats.length}`);

  return transformed;
}

function transformDiscussionsAndComments(
  vanillaDiscussions: VanillaDiscussion[],
  vanillaComments: VanillaComment[],
  mappings: IdMappings
): { threads: TransformedThread[]; posts: TransformedPost[] } {
  console.log('Transforming discussions and comments...');

  const threads: TransformedThread[] = [];
  const posts: TransformedPost[] = [];
  const usedSlugs = new Set<string>();

  // Group comments by discussion for ordering
  const commentsByDiscussion = new Map<number, VanillaComment[]>();
  for (const comment of vanillaComments) {
    if (!commentsByDiscussion.has(comment.thread_id)) {
      commentsByDiscussion.set(comment.thread_id, []);
    }
    commentsByDiscussion.get(comment.thread_id)!.push(comment);
  }

  let processedDiscussions = 0;
  const totalDiscussions = vanillaDiscussions.length;

  for (const discussion of vanillaDiscussions) {
    processedDiscussions++;
    if (processedDiscussions % 100 === 0) {
      console.log(`  Processing discussion ${processedDiscussions}/${totalDiscussions}...`);
    }

    const threadUuid = mapId(mappings, 'discussions', discussion.DiscussionID);
    const authorUuid = mappings.users[discussion.author_id];

    if (!authorUuid) {
      console.warn(`  Warning: No author found for discussion ${discussion.DiscussionID}, skipping`);
      continue;
    }

    const categoryUuid = mappings.categories[discussion.CategoryID];
    if (!categoryUuid) {
      console.warn(`  Warning: No category found for discussion ${discussion.DiscussionID}, skipping`);
      continue;
    }

    // Generate thread slug
    const title = discussion.title.slice(0, MAX_TITLE_LENGTH);
    const slug = generateUniqueSlug(title, usedSlugs);

    const createdAt = new Date(discussion.DateInserted).toISOString();
    const lastPostAt = discussion.DateLastComment
      ? new Date(discussion.DateLastComment).toISOString()
      : createdAt;

    // Create thread
    threads.push({
      vanilla_id: discussion.DiscussionID,
      new_uuid: threadUuid,
      category_id: categoryUuid,
      author_id: authorUuid,
      title,
      slug,
      is_pinned: Boolean(discussion.is_pinned),
      is_locked: Boolean(discussion.is_locked),
      created_at: createdAt,
      updated_at: createdAt,
      last_post_at: lastPostAt,
    });

    // Create first post from discussion body
    const { markdown: firstPostContent, html: firstPostHtml } = convertContent(
      discussion.Body,
      discussion.Format
    );

    posts.push({
      vanilla_id: null, // First post doesn't have a comment ID
      new_uuid: mapId(mappings, 'comments', -discussion.DiscussionID), // Negative ID for first posts
      thread_id: threadUuid,
      author_id: authorUuid,
      content: firstPostContent,
      content_html: firstPostHtml,
      is_edited: false,
      created_at: createdAt,
      updated_at: createdAt,
    });

    // Process comments for this discussion
    const discussionComments = commentsByDiscussion.get(discussion.DiscussionID) || [];
    for (const comment of discussionComments) {
      const commentAuthorUuid = mappings.users[comment.author_id];
      if (!commentAuthorUuid) {
        console.warn(`  Warning: No author found for comment ${comment.CommentID}, skipping`);
        continue;
      }

      const { markdown: content, html: contentHtml } = convertContent(
        comment.Body,
        comment.Format
      );

      const commentCreatedAt = new Date(comment.DateInserted).toISOString();
      const commentUpdatedAt = comment.DateUpdated
        ? new Date(comment.DateUpdated).toISOString()
        : commentCreatedAt;

      posts.push({
        vanilla_id: comment.CommentID,
        new_uuid: mapId(mappings, 'comments', comment.CommentID),
        thread_id: threadUuid,
        author_id: commentAuthorUuid,
        content,
        content_html: contentHtml,
        is_edited: commentUpdatedAt !== commentCreatedAt,
        created_at: commentCreatedAt,
        updated_at: commentUpdatedAt,
      });
    }
  }

  return { threads, posts };
}

async function transform() {
  console.log('Loading exported data...');

  const vanillaUsers = loadJsonFile<VanillaUser>('vanilla-users.json');
  const vanillaCategories = loadJsonFile<VanillaCategory>('vanilla-categories.json');
  const vanillaDiscussions = loadJsonFile<VanillaDiscussion>('vanilla-discussions.json');
  const vanillaComments = loadJsonFile<VanillaComment>('vanilla-comments.json');

  console.log(`  Users: ${vanillaUsers.length}`);
  console.log(`  Categories: ${vanillaCategories.length}`);
  console.log(`  Discussions: ${vanillaDiscussions.length}`);
  console.log(`  Comments: ${vanillaComments.length}`);
  console.log('');

  // Load or create ID mappings
  const mappings = loadMappings();

  // Transform data
  const transformedUsers = transformUsers(vanillaUsers, mappings);
  const transformedCategories = transformCategories(vanillaCategories, mappings);
  const { threads, posts } = transformDiscussionsAndComments(
    vanillaDiscussions,
    vanillaComments,
    mappings
  );

  // Save mappings
  saveMappings(mappings);

  // Save transformed data
  saveJsonFile('transformed-users.json', transformedUsers);
  saveJsonFile('transformed-categories.json', transformedCategories);
  saveJsonFile('transformed-threads.json', threads);
  saveJsonFile('transformed-posts.json', posts);

  console.log('\n========================================');
  console.log('Transform complete! Files saved to scripts/migration/data/');
  console.log('========================================');
  console.log('\nSummary:');
  console.log(`  Users:      ${transformedUsers.length}`);
  console.log(`  Categories: ${transformedCategories.length}`);
  console.log(`  Threads:    ${threads.length}`);
  console.log(`  Posts:      ${posts.length} (includes ${threads.length} first posts)`);
  console.log('\nID mappings saved to: scripts/migration/data/id-mappings.json');
  console.log('\nNext step: npx tsx scripts/migration/03-import-to-supabase.ts');
}

transform().catch((err) => {
  console.error('Transform failed:', err);
  process.exit(1);
});

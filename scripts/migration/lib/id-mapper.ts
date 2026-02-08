import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IdMappings } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const MAPPINGS_FILE = join(DATA_DIR, 'id-mappings.json');

/**
 * Load existing ID mappings or create empty structure
 */
export function loadMappings(): IdMappings {
  if (existsSync(MAPPINGS_FILE)) {
    return JSON.parse(readFileSync(MAPPINGS_FILE, 'utf-8'));
  }
  return {
    users: {},
    categories: {},
    discussions: {},
    comments: {},
  };
}

/**
 * Save ID mappings to file
 */
export function saveMappings(mappings: IdMappings): void {
  writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

/**
 * Generate a new UUID for a Vanilla ID and store the mapping
 */
export function mapId(
  mappings: IdMappings,
  type: keyof IdMappings,
  vanillaId: number
): string {
  if (mappings[type][vanillaId]) {
    return mappings[type][vanillaId];
  }
  const uuid = randomUUID();
  mappings[type][vanillaId] = uuid;
  return uuid;
}

/**
 * Get existing mapped UUID for a Vanilla ID
 */
export function getMappedId(
  mappings: IdMappings,
  type: keyof IdMappings,
  vanillaId: number
): string | undefined {
  return mappings[type][vanillaId];
}

/**
 * Slugify a string for URL-safe slugs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/**
 * Generate unique slug, appending counter if needed
 */
export function generateUniqueSlug(
  title: string,
  existingSlugs: Set<string>
): string {
  let slug = slugify(title);
  if (!slug) slug = 'thread'; // fallback for empty titles

  let counter = 1;
  let uniqueSlug = slug;

  while (existingSlugs.has(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
}

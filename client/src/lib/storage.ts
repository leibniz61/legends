import { supabase } from './supabase';
import {
  MAX_AVATAR_SIZE,
  MAX_POST_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from '@bookoflegends/shared';

export interface UploadResult {
  url: string;
  path: string;
}

function validateFile(
  file: File,
  maxSize: number
): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return { valid: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' };
  }
  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
  }
  return { valid: true };
}

function getFileExtension(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return ext;
  }
  // Fallback based on MIME type
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return mimeToExt[file.type] || 'jpg';
}

/**
 * Upload a profile avatar image
 * Replaces any existing avatar for the user
 */
export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  const validation = validateFile(file, MAX_AVATAR_SIZE);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getFileExtension(file);
  const path = `${userId}/avatar.${ext}`;

  // Upload with upsert to replace existing
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

  // Add cache-busting query param to force refresh
  const url = `${urlData.publicUrl}?t=${Date.now()}`;

  return { url, path };
}

/**
 * Remove a user's avatar
 */
export async function removeAvatar(userId: string): Promise<void> {
  // List all files in user's avatar folder and delete them
  const { data: files } = await supabase.storage.from('avatars').list(userId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error } = await supabase.storage.from('avatars').remove(paths);
    if (error) {
      throw new Error(error.message);
    }
  }
}

/**
 * Upload an image for use in posts
 * Each upload gets a unique filename
 */
export async function uploadPostImage(file: File, userId: string): Promise<UploadResult> {
  const validation = validateFile(file, MAX_POST_IMAGE_SIZE);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getFileExtension(file);
  const uuid = crypto.randomUUID();
  const path = `${userId}/${uuid}.${ext}`;

  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, file, {
      cacheControl: '31536000', // 1 year cache
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

/**
 * Delete a post image
 */
export async function deletePostImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from('post-images').remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

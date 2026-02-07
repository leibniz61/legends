import { z } from 'zod';
import {
  MAX_TITLE_LENGTH,
  MAX_POST_LENGTH,
  MAX_BIO_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  MAX_REPORT_DETAILS_LENGTH,
  MAX_RESOLUTION_NOTES_LENGTH,
} from '../constants.js';

/**
 * Shared validation schemas.
 * Use these on both client (form validation) and server (request validation).
 */

// ============================================================================
// Auth schemas
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(MIN_USERNAME_LENGTH, `Username must be at least ${MIN_USERNAME_LENGTH} characters`)
    .max(MAX_USERNAME_LENGTH, `Username must be at most ${MAX_USERNAME_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============================================================================
// Profile schemas
// ============================================================================

export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .max(MAX_USERNAME_LENGTH, `Display name must be at most ${MAX_USERNAME_LENGTH} characters`)
    .optional(),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be at most ${MAX_BIO_LENGTH} characters`)
    .optional(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

// ============================================================================
// Category schemas
// ============================================================================

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  sort_order: z.number().int().optional(),
  parent_id: z.string().uuid().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ============================================================================
// Thread schemas
// ============================================================================

export const threadCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(MAX_POST_LENGTH, `Content must be at most ${MAX_POST_LENGTH} characters`),
});

export const threadUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
    .optional(),
});

// ============================================================================
// Post schemas
// ============================================================================

export const postCreateSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(MAX_POST_LENGTH, `Content must be at most ${MAX_POST_LENGTH} characters`),
});

export const postUpdateSchema = postCreateSchema;

// ============================================================================
// Reaction schemas
// ============================================================================

export const reactionSchema = z.object({
  reaction_type: z.enum(['like', 'sword', 'crown', 'scroll', 'dragon']),
});

// ============================================================================
// Report schemas
// ============================================================================

export const reportCreateSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'inappropriate', 'off_topic', 'other']),
  details: z
    .string()
    .max(MAX_REPORT_DETAILS_LENGTH, `Details must be at most ${MAX_REPORT_DETAILS_LENGTH} characters`)
    .optional(),
});

export const reportUpdateSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']),
  resolution_notes: z
    .string()
    .max(MAX_RESOLUTION_NOTES_LENGTH, `Notes must be at most ${MAX_RESOLUTION_NOTES_LENGTH} characters`)
    .optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ThreadCreateInput = z.infer<typeof threadCreateSchema>;
export type ThreadUpdateInput = z.infer<typeof threadUpdateSchema>;
export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;

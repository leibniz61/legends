import { z } from 'zod';
import {
  MAX_TITLE_LENGTH,
  MAX_POST_LENGTH,
  MAX_BIO_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
} from '@bookoflegends/shared';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(MIN_USERNAME_LENGTH).max(MAX_USERNAME_LENGTH).regex(/^[a-zA-Z0-9_-]+$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const profileUpdateSchema = z.object({
  display_name: z.string().max(MAX_USERNAME_LENGTH).optional(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  avatar_url: z.string().url().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  sort_order: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const threadCreateSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  content: z.string().min(1).max(MAX_POST_LENGTH),
});

export const threadUpdateSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).optional(),
});

export const postCreateSchema = z.object({
  content: z.string().min(1).max(MAX_POST_LENGTH),
});

export const postUpdateSchema = z.object({
  content: z.string().min(1).max(MAX_POST_LENGTH),
});

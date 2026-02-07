/**
 * Re-export validation schemas from shared package.
 * This ensures client and server use identical validation rules.
 */
export {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  threadCreateSchema,
  threadUpdateSchema,
  postCreateSchema,
  postUpdateSchema,
  reactionSchema,
  reportCreateSchema,
  reportUpdateSchema,
} from '@bookoflegends/shared';

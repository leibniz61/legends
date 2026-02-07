import { useForm, UseFormReturn, DefaultValues, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * A wrapper around react-hook-form that integrates with Zod schemas.
 * Provides type-safe form handling with shared validation schemas.
 *
 * @example
 * const form = useZodForm({
 *   schema: registerSchema,
 *   defaultValues: { email: '', password: '', username: '' },
 * });
 *
 * <form onSubmit={form.handleSubmit(onSubmit)}>
 *   <input {...form.register('email')} />
 *   {form.formState.errors.email?.message}
 * </form>
 */
export function useZodForm<TFieldValues extends FieldValues>(options: {
  schema: z.ZodType<TFieldValues>;
  defaultValues?: DefaultValues<TFieldValues>;
}): UseFormReturn<TFieldValues> {
  return useForm<TFieldValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(options.schema as any),
    defaultValues: options.defaultValues,
    mode: 'onBlur', // Validate on blur for better UX
  });
}

/**
 * Helper type for extracting form data type from a schema.
 */
export type FormData<T extends z.ZodType<FieldValues>> = z.infer<T>;

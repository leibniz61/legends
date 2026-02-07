import { Link, type LinkProps } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';

type PrefetchType = 'thread' | 'category' | 'categories';

interface PrefetchLinkProps extends LinkProps {
  /**
   * The type of data to prefetch.
   */
  prefetchType: PrefetchType;
  /**
   * The ID or slug to prefetch (required for 'thread' and 'category' types).
   */
  prefetchId?: string;
}

/**
 * A Link component that prefetches data on hover/focus for faster navigation.
 *
 * @example
 * <PrefetchLink to={`/threads/${id}`} prefetchType="thread" prefetchId={id}>
 *   {title}
 * </PrefetchLink>
 *
 * @example
 * <PrefetchLink to={`/c/${slug}`} prefetchType="category" prefetchId={slug}>
 *   {name}
 * </PrefetchLink>
 */
export function PrefetchLink({
  prefetchType,
  prefetchId,
  onMouseEnter,
  onFocus,
  ...props
}: PrefetchLinkProps) {
  const { prefetchThread, prefetchCategory, prefetchCategories } = usePrefetch();

  function handlePrefetch() {
    switch (prefetchType) {
      case 'thread':
        if (prefetchId) prefetchThread(prefetchId);
        break;
      case 'category':
        if (prefetchId) prefetchCategory(prefetchId);
        break;
      case 'categories':
        prefetchCategories();
        break;
    }
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLAnchorElement>) {
    handlePrefetch();
    onMouseEnter?.(e);
  }

  function handleFocus(e: React.FocusEvent<HTMLAnchorElement>) {
    handlePrefetch();
    onFocus?.(e);
  }

  return (
    <Link
      {...props}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    />
  );
}

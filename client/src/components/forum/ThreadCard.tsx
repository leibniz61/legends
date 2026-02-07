import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pin, Lock, MessageSquare, Eye, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

interface ThreadAuthor {
  id?: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface ThreadCategory {
  id?: string;
  slug: string;
  name: string;
}

interface ThreadData {
  id: string;
  title: string;
  slug?: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  post_count: number;
  view_count?: number;
  last_post_at: string;
  author?: ThreadAuthor;
  category?: ThreadCategory;
}

interface ThreadCardProps {
  thread: ThreadData;
  /** Show author avatar (default: true) */
  showAvatar?: boolean;
  /** Show category link (default: true) */
  showCategory?: boolean;
  /** Show view count (default: true) */
  showViewCount?: boolean;
  /** Thread has unread posts */
  hasUnread?: boolean;
  /** Number of unread posts */
  unreadCount?: number;
  /** Optional action element on the right (e.g., unwatch button) */
  rightAction?: ReactNode;
}

export default function ThreadCard({
  thread,
  showAvatar = true,
  showCategory = true,
  showViewCount = true,
  hasUnread = false,
  unreadCount = 0,
  rightAction,
}: ThreadCardProps) {
  const authorName = thread.author?.display_name || thread.author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <Link to={`/threads/${thread.id}`}>
      <Card
        className={`bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group ${
          hasUnread ? 'border-l-2 border-l-primary' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left side: avatar + content */}
            <div className="flex items-start gap-3 min-w-0">
              {showAvatar && thread.author && (
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={thread.author.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-heading">
                    {authorInitial}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-center gap-2">
                  {hasUnread && (
                    <span
                      className="h-2 w-2 rounded-full bg-primary shrink-0"
                      title="Unread posts"
                    />
                  )}
                  {thread.is_pinned && (
                    <span title="Pinned">
                      <Pin className="h-4 w-4 text-primary shrink-0" />
                    </span>
                  )}
                  {thread.is_locked && (
                    <span title="Locked">
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    </span>
                  )}
                  <h3
                    className={`group-hover:text-primary transition-colors truncate min-w-0 ${
                      hasUnread ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {thread.title}
                  </h3>
                  {hasUnread && unreadCount > 0 && (
                    <Badge variant="default" className="text-xs shrink-0">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  {showCategory && thread.category && (
                    <>
                      <Link
                        to={`/c/${thread.category.slug}`}
                        className="hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {thread.category.name}
                      </Link>
                      <span>·</span>
                    </>
                  )}
                  {!showCategory && (
                    <>
                      <span>by {authorName}</span>
                      <span>·</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {thread.post_count}
                  </span>
                  {showViewCount && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {thread.view_count || 0}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(thread.last_post_at))} ago
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: optional action */}
            {rightAction && (
              <div className="shrink-0" onClick={(e) => e.preventDefault()}>
                {rightAction}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

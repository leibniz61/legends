import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import type { Notification } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, ExternalLink, Eye } from 'lucide-react';

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data as { notifications: Notification[]; total: number; unread: number };
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-2">
        <Skeleton className="h-8 w-48 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Notifications
        </h1>
        {(data?.unread ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            className="text-muted-foreground"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {data?.notifications.map((notif) => (
          <Card
            key={notif.id}
            className={`bg-card/50 transition-colors ${!notif.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{notif.title}</p>
                  {notif.body && (
                    <p className="text-sm text-muted-foreground mt-1">{notif.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at))} ago
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {notif.link && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={notif.link}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  {!notif.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(notif.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {data?.notifications.length === 0 && (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-50" />
              No notifications yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

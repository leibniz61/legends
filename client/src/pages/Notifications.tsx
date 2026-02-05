import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import type { Notification } from '@bookoflegends/shared';
import { formatDistanceToNow } from 'date-fns';

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
    return <div className="text-center py-12 text-muted-foreground">Loading notifications...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {(data?.unread ?? 0) > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm text-muted-foreground hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-1">
        {data?.notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 border rounded-lg ${!notif.is_read ? 'bg-accent/50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{notif.title}</p>
                {notif.body && (
                  <p className="text-sm text-muted-foreground mt-1">{notif.body}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.created_at))} ago
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notif.link && (
                  <Link to={notif.link} className="text-xs hover:underline">
                    View
                  </Link>
                )}
                {!notif.is_read && (
                  <button
                    onClick={() => markRead.mutate(notif.id)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {data?.notifications.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No notifications yet</p>
        )}
      </div>
    </div>
  );
}

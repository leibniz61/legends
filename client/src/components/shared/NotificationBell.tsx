import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const { profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile) return;

    api.get('/notifications?page=1').then(({ data }) => {
      setUnread(data.unread);
    });

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          setUnread((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to="/notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-glow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}

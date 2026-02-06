import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@bookoflegends/shared';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Ban } from 'lucide-react';

export default function ManageUsers() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      return data as { users: Profile[]; total: number };
    },
  });

  const toggleBan = useMutation({
    mutationFn: ({ id, unban }: { id: string; unban: boolean }) =>
      api.put(`/admin/users/${id}/ban`, { unban }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto mt-12 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Access denied
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-2">
        <Skeleton className="h-8 w-48 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-2 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Manage Users
      </h1>
      <p className="text-muted-foreground mb-6">{data?.total} users total</p>

      {/* Responsive table via cards */}
      <div className="hidden md:block">
        <Card className="bg-card/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Username</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Posts</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Joined</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.display_name || user.username}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={user.role}
                      onValueChange={(role) => changeRole.mutate({ id: user.id, role })}
                      disabled={user.id === currentUser.id}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-sm">{user.post_count}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="p-3 text-right">
                    {user.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => toggleBan.mutate({ id: user.id, unban: false })}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Ban
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {data?.users.map((user) => (
          <Card key={user.id} className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium">{user.display_name || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{user.post_count} posts</span>
                <span>{format(new Date(user.created_at), 'MMM d, yyyy')}</span>
              </div>
              {user.id !== currentUser.id && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <Select
                    value={user.role}
                    onValueChange={(role) => changeRole.mutate({ id: user.id, role })}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => toggleBan.mutate({ id: user.id, unban: false })}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

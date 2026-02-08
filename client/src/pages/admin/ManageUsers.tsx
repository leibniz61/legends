import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@bookoflegends/shared';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Ban, MoreHorizontal, Pencil, ShieldOff } from 'lucide-react';

interface AdminUser extends Profile {
  email: string | null;
  is_banned: boolean;
}

export default function ManageUsers() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Edit state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editError, setEditError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      return data as { users: AdminUser[]; total: number };
    },
  });

  const toggleBan = useMutation({
    mutationFn: ({ id, unban }: { id: string; unban: boolean }) =>
      api.put(`/admin/users/${id}/ban`, { unban }),
    onMutate: async ({ id, unban }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<{ users: AdminUser[]; total: number }>(['admin-users']);

      // Optimistically update
      queryClient.setQueryData<{ users: AdminUser[]; total: number }>(['admin-users'], (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((user) =>
            user.id === id ? { ...user, is_banned: !unban } : user
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['admin-users'], context.previousData);
      }
    },
    onSettled: () => {
      // Sync with server
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const updateUser = useMutation({
    mutationFn: (body: {
      id: string;
      username?: string;
      display_name?: string;
      email?: string;
      bio?: string;
    }) => api.put(`/admin/users/${body.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      setEditError('');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Failed to update user';
      setEditError(message);
    },
  });

  function handleEdit(user: AdminUser) {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditDisplayName(user.display_name || '');
    setEditEmail(user.email || '');
    setEditBio(user.bio || '');
    setEditError('');
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    // Validate username
    if (!editUsername.trim()) {
      setEditError('Username is required');
      return;
    }
    if (editUsername.length < 3) {
      setEditError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(editUsername)) {
      setEditError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    updateUser.mutate({
      id: editingUser.id,
      username: editUsername,
      display_name: editDisplayName || undefined,
      email: editEmail || undefined,
      bio: editBio || undefined,
    });
  }

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
                      {user.is_banned && (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      )}
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
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.is_banned ? (
                            <DropdownMenuItem
                              onClick={() => toggleBan.mutate({ id: user.id, unban: true })}
                            >
                              <ShieldOff className="h-4 w-4" />
                              Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => toggleBan.mutate({ id: user.id, unban: false })}
                            >
                              <Ban className="h-4 w-4" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.display_name || user.username}</p>
                    {user.is_banned && (
                      <Badge variant="destructive" className="text-xs">Banned</Badge>
                    )}
                  </div>
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
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.is_banned ? (
                        <DropdownMenuItem
                          onClick={() => toggleBan.mutate({ id: user.id, unban: true })}
                        >
                          <ShieldOff className="h-4 w-4" />
                          Unban User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => toggleBan.mutate({ id: user.id, unban: false })}
                        >
                          <Ban className="h-4 w-4" />
                          Ban User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                placeholder="Optional display name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                placeholder="User bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

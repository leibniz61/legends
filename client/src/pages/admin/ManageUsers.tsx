import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@bookoflegends/shared';
import { format } from 'date-fns';

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
    return <div className="text-center py-12 text-muted-foreground">Access denied</div>;
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Users</h1>
      <p className="text-muted-foreground mb-4">{data?.total} users total</p>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Username</th>
              <th className="text-left p-3 text-sm font-medium">Role</th>
              <th className="text-left p-3 text-sm font-medium">Posts</th>
              <th className="text-left p-3 text-sm font-medium">Joined</th>
              <th className="text-right p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3 text-sm">
                  {user.display_name || user.username}
                  <span className="text-muted-foreground ml-1">@{user.username}</span>
                </td>
                <td className="p-3 text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value })}
                    disabled={user.id === currentUser.id}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-3 text-sm">{user.post_count}</td>
                <td className="p-3 text-sm">{format(new Date(user.created_at), 'MMM d, yyyy')}</td>
                <td className="p-3 text-sm text-right">
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => toggleBan.mutate({ id: user.id, unban: false })}
                      className="text-destructive hover:underline text-sm"
                    >
                      Ban
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

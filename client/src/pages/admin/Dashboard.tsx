import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { profile } = useAuth();

  if (!profile || profile.role !== 'admin') {
    return <div className="text-center py-12 text-muted-foreground">Access denied</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/admin/categories"
          className="p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <h2 className="font-semibold text-lg">Manage Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and delete forum categories
          </p>
        </Link>

        <Link
          to="/admin/users"
          className="p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <h2 className="font-semibold text-lg">Manage Users</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View users, change roles, and manage bans
          </p>
        </Link>
      </div>
    </div>
  );
}

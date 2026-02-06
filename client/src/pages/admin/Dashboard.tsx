import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FolderOpen, Users } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();

  if (!profile || profile.role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto mt-12 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Access denied
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Admin Dashboard
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/admin/categories">
          <Card className="bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2 group-hover:text-primary transition-colors">
                <FolderOpen className="h-5 w-5" />
                Manage Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create, edit, and delete forum categories
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/users">
          <Card className="bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2 group-hover:text-primary transition-colors">
                <Users className="h-5 w-5" />
                Manage Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View users, change roles, and manage bans
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

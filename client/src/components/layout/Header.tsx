import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '@/components/shared/SearchBar';
import NotificationBell from '@/components/shared/NotificationBell';

export default function Header() {
  const { profile, loading, signOut } = useAuth();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Book of Legends
        </Link>

        <div className="flex-1 max-w-md mx-8">
          <SearchBar />
        </div>

        <nav className="flex items-center gap-4">
          {loading ? null : profile ? (
            <>
              <NotificationBell />
              <Link to={`/u/${profile.username}`} className="text-sm hover:underline">
                {profile.display_name || profile.username}
              </Link>
              {profile.role === 'admin' && (
                <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:underline"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm hover:underline">
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

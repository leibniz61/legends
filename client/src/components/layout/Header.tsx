import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import SearchBar from '@/components/shared/SearchBar';
import NotificationBell from '@/components/shared/NotificationBell';
import { Menu, Shield, User, Settings, LogOut } from 'lucide-react';

export default function Header() {
  const { session, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="px-4 flex h-16 items-center justify-end gap-4">
        {/* Search - desktop */}
        <div className="hidden md:block w-64">
          <SearchBar />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-3">
          {loading ? null : session && profile ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-heading">
                        {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium max-w-[120px] truncate">
                      {profile.display_name || profile.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/u/${profile.username}`)}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {profile.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-2">
          {session && profile && <NotificationBell />}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-6">
                <SearchBar />
                {session && profile ? (
                  <>
                    <div className="flex items-center gap-3 px-2 py-3 border-b border-border">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-heading">
                          {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{profile.display_name || profile.username}</p>
                        {profile.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs mt-0.5">Admin</Badge>
                        )}
                      </div>
                    </div>
                    <Link to={`/u/${profile.username}`} className="text-sm px-2 py-1.5 hover:text-primary transition-colors">
                      Profile
                    </Link>
                    <Link to="/settings/profile" className="text-sm px-2 py-1.5 hover:text-primary transition-colors">
                      Settings
                    </Link>
                    <Link to="/notifications" className="text-sm px-2 py-1.5 hover:text-primary transition-colors">
                      Notifications
                    </Link>
                    {profile.role === 'admin' && (
                      <Link to="/admin" className="text-sm px-2 py-1.5 hover:text-primary transition-colors">
                        Admin Panel
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start px-2">
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild className="justify-start">
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register">Register</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

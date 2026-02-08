import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/shared/SearchBar";
import NotificationBell from "@/components/shared/NotificationBell";
import { Menu, Shield, User, Settings, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const { session, profile, loading, signOut } = useAuth();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useSidebar();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    closeMobileMenu();
    navigate("/");
  };

  const handleNavClick = (path: string) => {
    closeMobileMenu();
    navigate(path);
  };

  return (
    <>
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
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-heading">
                          {(profile.display_name || profile.username)
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium max-w-30 truncate">
                        {profile.display_name || profile.username}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => navigate(`/u/${profile.username}`)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/settings/profile")}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {profile.role === "admin" && (
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
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

          {/* Mobile Nav Trigger */}
          <div className="md:hidden flex items-center gap-2">
            {session && profile && <NotificationBell />}
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 z-40 md:hidden transition-opacity duration-200",
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={closeMobileMenu}
      />

      {/* Mobile Menu Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-72 bg-card border-l border-border overflow-hidden",
          "transition-transform duration-200 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-heading font-bold text-primary">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileMenu}
              className="h-10 w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex flex-col gap-4">
              <SearchBar />
              {session && profile ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-3 border-b border-border">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-heading">
                        {(profile.display_name || profile.username)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {profile.display_name || profile.username}
                      </p>
                      {profile.role === "admin" && (
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavClick(`/u/${profile.username}`)}
                    className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => handleNavClick("/settings/profile")}
                    className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => handleNavClick("/unread")}
                    className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                  >
                    What's New
                  </button>
                  <button
                    onClick={() => handleNavClick("/watching")}
                    className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                  >
                    Watching
                  </button>
                  <button
                    onClick={() => handleNavClick("/notifications")}
                    className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                  >
                    Notifications
                  </button>
                  {profile.role === "admin" && (
                    <button
                      onClick={() => handleNavClick("/admin")}
                      className="text-sm px-2 py-1.5 text-left hover:text-primary transition-colors"
                    >
                      Admin Panel
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="justify-start px-2"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="justify-start"
                    onClick={closeMobileMenu}
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild onClick={closeMobileMenu}>
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

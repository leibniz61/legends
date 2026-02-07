import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/contexts/SidebarContext";
import api from "@/lib/api";
import type { CategoryWithChildren } from "@bookoflegends/shared";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function AppSidebar() {
  const { isOpen, toggle } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.categories as CategoryWithChildren[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const currentSlug = currentPath.startsWith("/c/")
    ? currentPath.split("/")[2]
    : null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 z-40 lg:hidden transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggle}
      />
      <aside
        className={cn(
          "h-full border-r border-border bg-card overflow-hidden",
          "transition-transform duration-200 ease-in-out lg:transition-[width] lg:duration-200",
          // Mobile/tablet: fixed overlay
          "fixed left-0 top-0 z-50 w-64 lg:relative lg:z-auto",
          isOpen ? "translate-x-0 lg:w-64" : "-translate-x-full lg:translate-x-0 lg:w-0",
        )}
      >
      <div className="w-64 h-full flex flex-col">
        {/* Header with toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Link to="/" className="font-heading font-bold text-primary">
            Book of Legends
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-10 w-10"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <nav className="flex-1 overflow-auto p-2">
          {/* User quick links */}
          {profile && (
            <div className="mb-4">
              <div className="space-y-1">
                <Link
                  to="/unread"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    currentPath === "/unread"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  What's New
                </Link>
                <Link
                  to="/watching"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    currentPath === "/watching"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Eye className="h-4 w-4" />
                  Watching
                </Link>
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Categories
            </p>

            {isLoading ? (
              <div className="space-y-2 px-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-1">
                {categories?.map((category) => (
                  <CategoryMenuItem
                    key={category.id}
                    category={category}
                    currentSlug={currentSlug}
                  />
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
    </>
  );
}

// Floating button to open sidebar when closed
export function SidebarOpenButton() {
  const { isOpen, toggle } = useSidebar();

  if (isOpen) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="fixed left-4 top-3 z-50 h-10 w-10"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );
}

interface CategoryMenuItemProps {
  category: CategoryWithChildren;
  currentSlug: string | null;
}

function CategoryMenuItem({ category, currentSlug }: CategoryMenuItemProps) {
  const hasChildren = category.children.length > 0;
  const isActive = category.slug === currentSlug;
  const hasActiveChild = category.children.some((c) => c.slug === currentSlug);

  const [isOpen, setIsOpen] = useState(isActive || hasActiveChild);

  if (!hasChildren) {
    return (
      <Link
        to={`/c/${category.slug}`}
        className={cn(
          "block ml-6 px-2 py-2 rounded-md text-sm transition-colors truncate",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted",
        )}
      >
        {category.name}
      </Link>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center min-w-0">
        <CollapsibleTrigger asChild>
          <button className="p-1 hover:bg-muted rounded transition-colors shrink-0">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-90",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <Link
          to={`/c/${category.slug}`}
          className={cn(
            "flex-1 px-2 py-2 rounded-md text-sm transition-colors min-w-0 truncate",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted",
          )}
        >
          {category.name}
        </Link>
      </div>

      <CollapsibleContent className="ml-5 mt-1 space-y-1 border-l border-border pl-2">
        {category.children.map((child) => (
          <Link
            key={child.id}
            to={`/c/${child.slug}`}
            className={cn(
              "block px-3 py-1.5 rounded-md text-sm transition-colors truncate",
              child.slug === currentSlug
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {child.name}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

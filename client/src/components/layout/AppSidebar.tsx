import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
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
import { cn } from "@/lib/utils";

export default function AppSidebar() {
  const { isOpen, toggle } = useSidebar();
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
    <aside
      className={cn(
        "h-full border-r border-border bg-card/50 transition-[width] duration-200 overflow-hidden",
        isOpen ? "w-64" : "w-0",
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
      <div className="flex items-center min-w-0">
        <div className="w-6 shrink-0" />
        <Link
          to={`/c/${category.slug}`}
          className={cn(
            "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted",
          )}
        >
          <ScrollText className="h-4 w-4 shrink-0" />
          <span className="truncate">{category.name}</span>
        </Link>
      </div>
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
            "flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors min-w-0",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted",
          )}
        >
          <ScrollText className="h-4 w-4 shrink-0" />
          <span className="truncate">{category.name}</span>
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

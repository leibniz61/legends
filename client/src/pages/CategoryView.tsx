import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Thread,
  CategoryWithParent,
  CategoryWithChildren,
} from "@bookoflegends/shared";

// Extended thread with read status and view count (from API when authenticated)
interface ThreadWithReadStatus extends Thread {
  has_unread: boolean;
  unread_count: number;
  view_count: number;
}
import { THREADS_PER_PAGE } from "@bookoflegends/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared";
import ThreadCard from "@/components/forum/ThreadCard";
import CategoryCard from "@/components/forum/CategoryCard";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

export default function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");

  const { data: categoryData } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}`);
      return data.category as CategoryWithParent;
    },
  });

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ["threads", slug, page],
    queryFn: async () => {
      const { data } = await api.get(
        `/categories/${slug}/threads?page=${page}`,
      );
      return data as {
        threads: ThreadWithReadStatus[];
        total: number;
        page: number;
      };
    },
  });

  // Fetch subcategories for parent categories (reuses categories cache)
  const { data: allCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.categories as CategoryWithChildren[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Find subcategories if this is a parent category
  const subcategories =
    categoryData && !categoryData.parent
      ? allCategories?.find((c) => c.slug === slug)?.children || []
      : [];

  const totalPages = threadsData
    ? Math.ceil(threadsData.total / THREADS_PER_PAGE)
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            {categoryData?.parent && (
              <>
                <Link
                  to={`/c/${categoryData.parent.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {categoryData.parent.name}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span>{categoryData?.name || slug}</span>
          </nav>
          <h1 className="text-2xl font-heading font-bold">
            {categoryData?.name || slug}
          </h1>
          {categoryData?.description && (
            <p className="text-muted-foreground mt-1">
              {categoryData.description}
            </p>
          )}
        </div>
        {profile && (
          <Button asChild>
            <Link to={`/c/${slug}/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Thread
            </Link>
          </Button>
        )}
      </div>

      {/* Subcategories - only for parent categories */}
      {subcategories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Subcategories
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {subcategories.map((sub) => (
              <CategoryCard
                key={sub.id}
                category={sub}
                compact
                showIcon
                showLastActivity={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Thread list */}
      {isLoading ? (
        <LoadingState variant="thread" count={5} showAvatar={false} />
      ) : threadsData?.threads.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            No threads yet. Be the first to start a discussion!
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {threadsData?.threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                showAvatar={false}
                showCategory={false}
                hasUnread={thread.has_unread}
                unreadCount={thread.unread_count}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

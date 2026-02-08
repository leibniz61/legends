import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CategoryWithParent } from "@bookoflegends/shared";
import { threadCreateSchema, type ThreadCreateInput } from "@bookoflegends/shared";
import { useZodForm } from "@/hooks/useZodForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarkdownEditor } from "@/components/forum/MarkdownEditor";
import { ScrollText } from "lucide-react";

export default function NewThread() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const form = useZodForm({
    schema: threadCreateSchema,
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const { data: categoryData } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}`);
      return data.category as CategoryWithParent;
    },
  });

  async function onSubmit(data: ThreadCreateInput) {
    setError("");

    try {
      const { data: responseData } = await api.post(`/categories/${slug}/threads`, data);
      navigate(`/threads/${responseData.thread.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to create thread";
      setError(message);
    }
  }

  const { errors, isSubmitting } = form.formState;
  const content = form.watch("content");

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="text-sm text-muted-foreground mb-4">
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
        <Link
          to={`/c/${slug}`}
          className="hover:text-primary transition-colors"
        >
          {categoryData?.name || slug}
        </Link>
        <span className="mx-2">/</span>
        <span>New Thread</span>
      </nav>

      <Card className="bg-card/50 border-border/60">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            New Thread
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Thread title"
                {...form.register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Content</Label>
              <MarkdownEditor
                value={content}
                onChange={(val) => form.setValue("content", val, { shouldValidate: true })}
                height={300}
                disabled={isSubmitting}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Thread"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

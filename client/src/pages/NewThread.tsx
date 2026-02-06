import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MDEditor from '@uiw/react-md-editor';
import api from '@/lib/api';
import type { CategoryWithParent } from '@bookoflegends/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollText } from 'lucide-react';

export default function NewThread() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: categoryData } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get(`/categories/${slug}`);
      return data.category as CategoryWithParent;
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post(`/categories/${slug}/threads`, { title, content });
      navigate(`/threads/${data.thread.id}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create thread';
      setError(message);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="mx-2">/</span>
        {categoryData?.parent && (
          <>
            <Link to={`/c/${categoryData.parent.slug}`} className="hover:text-primary transition-colors">
              {categoryData.parent.name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <Link to={`/c/${slug}`} className="hover:text-primary transition-colors">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Thread title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <div data-color-mode="dark">
                <MDEditor value={content} onChange={(val) => setContent(val || '')} height={300} />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Creating...' : 'Create Thread'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CategoryWithChildren } from '@bookoflegends/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Plus, Trash2, CornerDownRight } from 'lucide-react';

export default function ManageCategories() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.categories as CategoryWithChildren[];
    },
  });

  const createCategory = useMutation({
    mutationFn: (body: { name: string; slug: string; description?: string; parent_id?: string }) =>
      api.post('/categories', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      setSlug('');
      setDescription('');
      setParentId('none');
      setError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create category';
      setError(message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  if (!profile || profile.role !== 'admin') {
    return (
      <Card className="max-w-md mx-auto mt-12 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Access denied
        </CardContent>
      </Card>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createCategory.mutate({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: description || undefined,
      parent_id: parentId !== 'none' ? parentId : undefined,
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
        <FolderOpen className="h-6 w-6 text-primary" />
        Manage Categories
      </h1>

      {/* Create form */}
      <Card className="bg-card/50 border-border/60 mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a parent to create a subcategory (max 2 levels)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                placeholder="Category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="Auto-generated if empty"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Category list - hierarchical */}
      <h2 className="text-lg font-heading font-semibold mb-4">Existing Categories</h2>
      <div className="space-y-2">
        {categories?.map((category) => (
          <div key={category.id}>
            {/* Parent category */}
            <Card className="bg-card/50">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">/{category.slug}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const msg = category.children.length > 0
                      ? 'Delete this category and all its subcategories? All threads will be deleted.'
                      : 'Delete this category? All threads will be deleted.';
                    if (confirm(msg)) {
                      deleteCategory.mutate(category.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Subcategories */}
            {category.children.map((child) => (
              <Card key={child.id} className="bg-card/50 ml-6 mt-1 border-l-2 border-l-primary/30">
                <CardContent className="p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-sm">{child.name}</h3>
                      <p className="text-xs text-muted-foreground">/{child.slug}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Delete this subcategory? All threads will be deleted.')) {
                        deleteCategory.mutate(child.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

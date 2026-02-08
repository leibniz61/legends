import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, CategoryWithChildren } from '@bookoflegends/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Plus, Trash2, Pencil, CornerDownRight } from 'lucide-react';

export default function ManageCategories() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const [error, setError] = useState('');

  // Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParentId, setEditParentId] = useState<string>('none');
  const [editError, setEditError] = useState('');

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

  const updateCategory = useMutation({
    mutationFn: (body: { id: string; name: string; description?: string; parent_id?: string | null }) =>
      api.put(`/categories/${body.id}`, {
        name: body.name,
        description: body.description,
        parent_id: body.parent_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setEditError('');
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update category';
      setEditError(message);
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

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    createCategory.mutate({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: description || undefined,
      parent_id: parentId !== 'none' ? parentId : undefined,
    });
  }

  function handleEdit(category: Category, currentParentId?: string) {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditParentId(currentParentId || 'none');
    setEditError('');
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;

    // Validate name
    if (!editName.trim()) {
      setEditError('Name is required');
      return;
    }

    updateCategory.mutate({
      id: editingCategory.id,
      name: editName,
      description: editDescription || undefined,
      parent_id: editParentId !== 'none' ? editParentId : null,
    });
  }

  // Get top-level categories for parent selection (excluding the one being edited)
  const topLevelCategories = categories?.filter(c => c.id !== editingCategory?.id) || [];

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
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="Auto-generated if empty"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                </div>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(child, category.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-parent">Parent Category</Label>
              <Select value={editParentId} onValueChange={setEditParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {topLevelCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Move this category under a different parent
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

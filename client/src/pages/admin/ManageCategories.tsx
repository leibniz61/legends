import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Category } from '@bookoflegends/shared';

export default function ManageCategories() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.categories as Category[];
    },
  });

  const createCategory = useMutation({
    mutationFn: (body: { name: string; slug: string; description?: string }) =>
      api.post('/categories', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      setSlug('');
      setDescription('');
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
    return <div className="text-center py-12 text-muted-foreground">Access denied</div>;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createCategory.mutate({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: description || undefined,
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>

      {/* Create form */}
      <div className="border rounded-lg p-4 mb-8">
        <h2 className="font-semibold mb-4">Create Category</h2>
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background"
          />
          <input
            type="text"
            placeholder="Slug (auto-generated if empty)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background"
          />
          <button
            type="submit"
            disabled={createCategory.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {createCategory.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {data?.map((category) => (
          <div key={category.id} className="flex justify-between items-center p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">{category.name}</h3>
              <p className="text-sm text-muted-foreground">/{category.slug}</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Delete this category? All threads will be deleted.')) {
                  deleteCategory.mutate(category.id);
                }
              }}
              className="text-sm text-destructive hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

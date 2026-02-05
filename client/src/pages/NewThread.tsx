import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import api from '@/lib/api';

export default function NewThread() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <h1 className="text-2xl font-bold mb-6">New Thread</h1>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background"
            placeholder="Thread title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Content</label>
          <MDEditor value={content} onChange={(val) => setContent(val || '')} height={300} />
        </div>
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Thread'}
        </button>
      </form>
    </div>
  );
}

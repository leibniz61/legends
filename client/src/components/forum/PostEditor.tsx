import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import api from '@/lib/api';

interface PostEditorProps {
  threadId: string;
  onSuccess: () => void;
}

export default function PostEditor({ threadId, onSuccess }: PostEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    try {
      await api.post(`/threads/${threadId}/posts`, { content });
      setContent('');
      onSuccess();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to post reply';
      setError(message);
    }

    setLoading(false);
  }

  return (
    <div>
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}
      <MDEditor value={content} onChange={(val) => setContent(val || '')} height={200} />
      <button
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
        className="mt-3 bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Posting...' : 'Post Reply'}
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { Send } from 'lucide-react';

interface PostEditorProps {
  threadId: string;
  onSuccess: () => void;
  initialContent?: string;
}

export default function PostEditor({ threadId, onSuccess, initialContent = '' }: PostEditorProps) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (initialContent) {
      setContent(prev => prev ? `${prev}\n\n${initialContent}` : initialContent);
    }
  }, [initialContent]);
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
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div data-color-mode="dark">
        <MDEditor value={content} onChange={(val) => setContent(val || '')} height={200} />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
        className="mt-3"
      >
        <Send className="mr-2 h-4 w-4" />
        {loading ? 'Posting...' : 'Post Reply'}
      </Button>
    </div>
  );
}

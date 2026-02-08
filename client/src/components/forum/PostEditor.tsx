import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarkdownEditor } from "./MarkdownEditor";
import api from "@/lib/api";
import { Send } from "lucide-react";

interface PostEditorProps {
  threadId: string;
  onSuccess: () => void;
  initialContent?: string;
}

export default function PostEditor({
  threadId,
  onSuccess,
  initialContent = "",
}: PostEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialContent) {
      setContent((prev) =>
        prev ? `${prev}\n\n${initialContent}` : initialContent
      );
    }
  }, [initialContent]);

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    setError("");

    try {
      await api.post(`/threads/${threadId}/posts`, { content });
      setContent("");
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to post reply";
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
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height={200}
        disabled={loading}
      />
      <div className="flex justify-end mt-4">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
        >
          <Send className="h-4 w-4" />
          {loading ? "Posting..." : "Post Reply"}
        </Button>
      </div>
    </div>
  );
}

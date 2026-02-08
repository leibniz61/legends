import { useState, useCallback, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { ImageUploadButton } from "./ImageUploadButton";
import { ImageResizeDialog } from "./ImageResizeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { uploadPostImage } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 200,
  disabled = false,
}: MarkdownEditorProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const insertedRef = useRef(false);

  // Handle pasted images
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!profile || disabled) return;

      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          setUploading(true);
          try {
            const result = await uploadPostImage(file, profile.id);
            setUploadedImage({ url: result.url, name: "pasted image" });
            insertedRef.current = false;
            setDialogOpen(true);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setUploading(false);
          }
          break;
        }
      }
    },
    [profile, disabled]
  );

  // Handle dropped images
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      // Always prevent default to stop browser from opening the file
      e.preventDefault();

      if (!profile || disabled) return;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) return;

      setUploading(true);

      try {
        const result = await uploadPostImage(file, profile.id);
        setUploadedImage({ url: result.url, name: file.name });
        insertedRef.current = false;
        setDialogOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [profile, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle image insert from any source
  function handleImageInsert(markdown: string) {
    onChange(value ? `${value}\n${markdown}` : markdown);
  }

  // Handle resize dialog insert
  function handleDialogInsert(markdown: string) {
    insertedRef.current = true;
    handleImageInsert(markdown);
    setUploadedImage(null);
    setDialogOpen(false);
    toast.success("Image inserted");
  }

  // Handle resize dialog close
  function handleDialogClose(open: boolean) {
    if (!open && !insertedRef.current && uploadedImage) {
      // Insert at full size if closed without explicit insert
      handleImageInsert(`![${uploadedImage.name}](${uploadedImage.url})`);
      toast.success("Image inserted");
    }
    setDialogOpen(open);
    if (!open) {
      setUploadedImage(null);
    }
  }

  return (
    <div>
      <div
        data-color-mode="dark"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          height={height}
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        {profile && (
          <ImageUploadButton
            userId={profile.id}
            onInsert={handleImageInsert}
            disabled={disabled || uploading}
          />
        )}
        {uploading && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading...
          </span>
        )}
      </div>

      {uploadedImage && (
        <ImageResizeDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          imageUrl={uploadedImage.url}
          imageName={uploadedImage.name}
          onInsert={handleDialogInsert}
        />
      )}
    </div>
  );
}

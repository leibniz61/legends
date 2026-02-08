import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Image, Loader2 } from "lucide-react";
import { uploadPostImage } from "@/lib/storage";
import { ImageResizeDialog } from "./ImageResizeDialog";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  userId: string;
  onInsert: (markdown: string) => void;
  disabled?: boolean;
}

export function ImageUploadButton({
  userId,
  onInsert,
  disabled,
}: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const insertedRef = useRef(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const result = await uploadPostImage(file, userId);
      // Store the uploaded image info and open resize dialog
      setUploadedImage({ url: result.url, name: file.name });
      insertedRef.current = false;
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDialogInsert(markdown: string) {
    insertedRef.current = true;
    onInsert(markdown);
    setUploadedImage(null);
    setDialogOpen(false);
    toast.success("Image inserted");
  }

  function handleDialogClose(open: boolean) {
    if (!open && !insertedRef.current && uploadedImage) {
      // Dialog closed without inserting - insert at full size
      onInsert(`![${uploadedImage.name}](${uploadedImage.url})`);
      toast.success("Image inserted");
    }
    setDialogOpen(open);
    if (!open) {
      setUploadedImage(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload image"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Image className="h-4 w-4" />
        )}
      </Button>

      {uploadedImage && (
        <ImageResizeDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          imageUrl={uploadedImage.url}
          imageName={uploadedImage.name}
          onInsert={handleDialogInsert}
        />
      )}
    </>
  );
}

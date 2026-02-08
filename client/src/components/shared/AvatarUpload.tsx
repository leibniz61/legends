import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { uploadAvatar, removeAvatar } from '@/lib/storage';
import { Camera, Loader2, X } from 'lucide-react';
import { MAX_AVATAR_SIZE } from '@bookoflegends/shared';

interface AvatarUploadProps {
  currentUrl: string | null;
  userId: string;
  displayName: string | null;
  username: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

export function AvatarUpload({
  currentUrl,
  userId,
  displayName,
  username,
  onUpload,
  onRemove,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentUrl;
  const initial = (displayName || username).charAt(0).toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const result = await uploadAvatar(file, userId);
      onUpload(result.url);
      setPreviewUrl(null); // Clear preview, use actual URL
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreviewUrl(null); // Revert to original
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
      URL.revokeObjectURL(localPreview);
    }
  }

  async function handleRemove() {
    setError('');
    setUploading(true);

    try {
      await removeAvatar(userId);
      onRemove();
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Profile Picture</Label>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={displayUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-heading">
              {initial}
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="avatar-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="h-4 w-4" />
            {currentUrl ? 'Change' : 'Upload'}
          </Button>
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Max {MAX_AVATAR_SIZE / 1024 / 1024}MB. JPG, PNG, GIF, or WebP.
      </p>
    </div>
  );
}

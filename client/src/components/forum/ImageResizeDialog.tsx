import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IMAGE_SIZE_PRESETS } from '@bookoflegends/shared';

interface ImageResizeDialogProps {
  imageUrl: string;
  imageName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (markdown: string) => void;
}

export function ImageResizeDialog({
  imageUrl,
  imageName,
  open,
  onOpenChange,
  onInsert,
}: ImageResizeDialogProps) {
  const [width, setWidth] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  function handlePreset(preset: keyof typeof IMAGE_SIZE_PRESETS | 'full') {
    if (preset === 'full') {
      setWidth('');
      setSelectedPreset('full');
    } else {
      setWidth(String(IMAGE_SIZE_PRESETS[preset].width));
      setSelectedPreset(preset);
    }
  }

  function handleCustomWidth(value: string) {
    setWidth(value);
    setSelectedPreset(null);
  }

  function handleInsert() {
    let markdown: string;

    if (width && parseInt(width) > 0) {
      // Use HTML img tag for sized images
      const safeAlt = imageName.replace(/"/g, '&quot;');
      markdown = `<img src="${imageUrl}" alt="${safeAlt}" width="${width}" />`;
    } else {
      // Standard markdown for full size
      markdown = `![${imageName}](${imageUrl})`;
    }

    // Reset state first
    setWidth('');
    setSelectedPreset(null);
    // Then notify parent (parent handles closing)
    onInsert(markdown);
  }

  function handleCancel() {
    onOpenChange(false);
    setWidth('');
    setSelectedPreset(null);
  }

  const previewWidth = width ? `${width}px` : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Insert Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={imageName}
              className="max-h-full object-contain rounded"
              style={previewWidth ? { width: previewWidth, maxWidth: '100%' } : { maxWidth: '100%' }}
            />
          </div>

          {/* Size presets */}
          <div className="flex flex-col gap-2">
            <Label>Size</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(IMAGE_SIZE_PRESETS) as (keyof typeof IMAGE_SIZE_PRESETS)[]).map(
                (preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={selectedPreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePreset(preset)}
                  >
                    {IMAGE_SIZE_PRESETS[preset].label} ({IMAGE_SIZE_PRESETS[preset].width}px)
                  </Button>
                )
              )}
              <Button
                type="button"
                variant={selectedPreset === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePreset('full')}
              >
                Full Size
              </Button>
            </div>
          </div>

          {/* Custom width */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-width">Custom Width (px)</Label>
            <Input
              id="custom-width"
              type="number"
              placeholder="e.g., 300"
              value={width}
              onChange={(e) => handleCustomWidth(e.target.value)}
              min="50"
              max="2000"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleInsert}>Insert Image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

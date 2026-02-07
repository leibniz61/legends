import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
}

export function EmptyState({ icon: Icon, message, description }: EmptyStateProps) {
  return (
    <Card className="bg-card/50">
      <CardContent className="py-12 text-center text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{message}</p>
        {description && <p className="text-sm mt-2">{description}</p>}
      </CardContent>
    </Card>
  );
}

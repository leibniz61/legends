import { Separator } from '@/components/ui/separator';

export default function Footer() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="container mx-auto px-4 py-6 flex flex-col items-center gap-1">
        <p className="text-sm font-heading text-muted-foreground tracking-wide">
          Book of Legends
        </p>
        <p className="text-xs text-muted-foreground/60">
          A Pathfinder RPG Community
        </p>
      </div>
    </footer>
  );
}

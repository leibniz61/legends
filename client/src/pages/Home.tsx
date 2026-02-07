import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingState } from "@/components/shared";
import CategoryCard from "@/components/forum/CategoryCard";
import api from "@/lib/api";
import type { CategoryWithChildren } from "@bookoflegends/shared";
import { ChevronRight, ChevronDown } from "lucide-react";

function ParentCategoryGroup({ category }: { category: CategoryWithChildren }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = category.children.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="p-1.5 mt-3 hover:bg-muted rounded transition-colors shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-7 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <CategoryCard category={category} />
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent className="flex flex-col gap-2 ml-9">
            {category.children.map((child) => (
              <CategoryCard key={child.id} category={child} compact />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.categories as CategoryWithChildren[];
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-3 tracking-wide">
          Book of Legends
        </h1>
        <p className="text-muted-foreground text-lg">
          A Pathfinder RPG Community
        </p>
        <Separator className="mt-6 max-w-xs mx-auto opacity-30" />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {isLoading ? (
          <LoadingState variant="category" count={4} />
        ) : data?.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              No categories yet. An admin needs to create some.
            </CardContent>
          </Card>
        ) : (
          data?.map((category) => (
            <ParentCategoryGroup key={category.id} category={category} />
          ))
        )}
      </div>
    </div>
  );
}

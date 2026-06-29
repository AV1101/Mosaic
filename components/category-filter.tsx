"use client";

import { cn } from "@/lib/utils";
import type { SectionCategory } from "@/types/section";

export function CategoryFilter({
  active,
  onChange,
  categories,
}: {
  active: SectionCategory | "All";
  onChange: (category: SectionCategory | "All") => void;
  categories: SectionCategory[];
}) {
  return (
    <div className="scrollbar-invisible flex gap-2 overflow-x-auto pb-2">
      {(["All", ...categories] as Array<SectionCategory | "All">).map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-primary/10",
            active === category ? "border-primary bg-primary text-primary-foreground" : "bg-background/70"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

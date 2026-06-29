"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Star } from "lucide-react";
import { motion } from "framer-motion";
import { CategoryFilter } from "@/components/category-filter";
import { SearchBar } from "@/components/search-bar";
import { AddCard, AddItemModal } from "@/components/add-item-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComponentPreviewModal } from "@/components/component-preview-modal";
import type { SectionCategory, SectionItem } from "@/types/section";

export function LibraryClient({ sections }: { sections: SectionItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SectionCategory | "All">("All");
  const [sort, setSort] = useState("recent");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<SectionItem | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(sections.map((s) => s.category))).filter(Boolean).sort(),
    [sections]
  );

  const filtered = useMemo(() => {
    return sections
      .filter((section, index) => {
        const matchesCategory = category === "All" || section.category === category;
        const haystack = `${section.name} ${section.category} ${section.description} ${section.tags.join(" ")}`.toLowerCase();
        const favoriteMatch = !favoritesOnly || index % 2 === 0;
        return matchesCategory && favoriteMatch && haystack.includes(query.toLowerCase());
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : b.createdAt.localeCompare(a.createdAt)
      );
  }, [category, favoritesOnly, query, sort, sections]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Component Library</h1>
          <p className="mt-2 text-muted-foreground">Reusable UI components for your design system.</p>
        </div>
        <div className="w-full xl:max-w-xl">
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </div>

      <CategoryFilter active={category} onChange={setCategory} categories={categories} />

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Browse and contribute reusable components.
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-2xl border bg-background px-3 text-sm"
          >
            <option value="recent">Recently added</option>
            <option value="name">Name</option>
          </select>
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Star className="h-4 w-4" /> Favorites
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((section) => (
          <LibraryCard
            key={section.id}
            section={section}
            onClick={() => setSelected(section)}
          />
        ))}
        <AddCard onClick={() => setAddOpen(true)} />
      </div>

      {!filtered.length && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
          <h2 className="text-xl font-semibold">No components yet</h2>
          <p className="mt-2 text-muted-foreground">
            Add your first component using the + card above.
          </p>
        </div>
      )}

      <AddItemModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Component"
        categoriesEndpoint="/categories/components"
        typeOptions={["Button", "Card", "Form", "Navigation", "Data Display", "Overlay"]}
        submitEndpoint="/components/add"
        designSystem="Chatbot Design System"
        onSuccess={() => router.refresh()}
        showSecondFigmaUrl={true}
      />

      {selected && (
        <ComponentPreviewModal section={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function LibraryCard({
  section,
  onClick,
}: {
  section: SectionItem;
  onClick: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
      className="group cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:border-primary/40 hover:shadow-glow"
      onClick={onClick}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-white">
        {section.previewImage ? (
          <img
            src={section.previewImage}
            alt={`${section.name} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div>
          <Badge>{section.category}</Badge>
          <h3 className="mt-3 text-lg font-semibold tracking-tight">{section.name}</h3>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {section.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {section.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

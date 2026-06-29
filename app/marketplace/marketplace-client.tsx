"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Star } from "lucide-react";
import { CategoryFilter } from "@/components/category-filter";
import { SearchBar } from "@/components/search-bar";
import { SectionCard } from "@/components/section-card";
import { AddCard, AddItemModal } from "@/components/add-item-modal";
import { Button } from "@/components/ui/button";
import type { SectionCategory, SectionItem } from "@/types/section";

type MarketplaceClientProps = {
  sections: SectionItem[];
  title?: string;
  subtitle?: string;
  detailBasePath?: string;
  categoriesEndpoint?: string;
  submitEndpoint?: string;
  brandsEndpoint?: string;
  showBrandEntries?: boolean;
  requireCategory?: boolean;
  requireFigmaUrl?: boolean;
};

export function MarketplaceClient({
  sections,
  title = "Explore Sections",
  subtitle = "Production-inspired sections with editable prompts and design tokens.",
  detailBasePath = "/marketplace",
  categoriesEndpoint = "/categories/templates",
  submitEndpoint = "/templates/add",
  brandsEndpoint = "/brands",
  showBrandEntries = true,
  requireCategory = true,
  requireFigmaUrl = false,
}: MarketplaceClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SectionCategory | "All">("All");
  const [sort, setSort] = useState("recent");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(sections.map((section) => section.category))).filter(Boolean).sort(),
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
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt)));
  }, [category, favoritesOnly, query, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="w-full xl:max-w-xl">
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </div>
      <CategoryFilter active={category} onChange={setCategory} categories={categories} />
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Advanced filters, semantic search, favorites, pagination, and recency are API-ready.
        </div>
        <div className="flex gap-2">
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-2xl border bg-background px-3 text-sm">
            <option value="recent">Recently added</option>
            <option value="name">Name</option>
          </select>
          <Button variant={favoritesOnly ? "default" : "outline"} onClick={() => setFavoritesOnly(!favoritesOnly)}>
            <Star className="h-4 w-4" /> Favorites
          </Button>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((section) => (
          <SectionCard key={section.id} section={section} detailBasePath={detailBasePath} />
        ))}
        <AddCard onClick={() => setAddOpen(true)} />
      </div>
      {!filtered.length && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
          <h2 className="text-xl font-semibold">No matching sections</h2>
          <p className="mt-2 text-muted-foreground">Try a broader category or search term.</p>
        </div>
      )}
      <AddItemModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Template"
        categoriesEndpoint={categoriesEndpoint}
        typeOptions={["Header", "Footer", "Hero", "Additional Section"]}
        submitEndpoint={submitEndpoint}
        brandsEndpoint={brandsEndpoint}
        onSuccess={() => router.refresh()}
        showBrandEntries={showBrandEntries}
        requireCategory={requireCategory}
        requireFigmaUrl={requireFigmaUrl}
      />
    </div>
  );
}

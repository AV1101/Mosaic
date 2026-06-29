"use client";

import { motion } from "framer-motion";
import { WandSparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SectionItem } from "@/types/section";

export function SectionCard({ section, detailBasePath = "/marketplace" }: { section: SectionItem; detailBasePath?: string }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
      className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:border-primary/40 hover:shadow-glow"
    >
      <Link href={`${detailBasePath}/${section.id}`} className="block">
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
      </Link>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge>{section.category}</Badge>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{section.name}</h3>
          </div>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
        <div className="flex flex-wrap gap-2">
          {section.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1">
            <Link href={`${detailBasePath}/${section.id}`}>
              <WandSparkles className="h-4 w-4" /> Generate
            </Link>
          </Button>

        </div>
      </div>
    </motion.article>
  );
}

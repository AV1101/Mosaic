"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api-client";

type PromptRow = {
  id: number;
  name: string;
  body: string;
  status: string;
  version: number;
  framework_targets: string[];
  token_placeholders: string[];
  ai_metadata: Record<string, unknown>;
};

export function PromptsClient() {
  const [query, setQuery] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => apiFetch<PromptRow[]>("/prompts"),
    retry: false
  });

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((prompt) => {
      return [prompt.name, prompt.body, prompt.status, prompt.framework_targets.join(" ")].some((value) => value.toLowerCase().includes(needle));
    });
  }, [data, query]);

  async function copyPrompt(prompt: PromptRow) {
    await navigator.clipboard.writeText(prompt.body);
    toast.success(`${prompt.name} copied`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Prompt Table</h1>
          <p className="mt-2 text-muted-foreground">Website-appended prompts that are ready to paste into AI coding extensions.</p>
        </div>
        <Button asChild>
          <Link href="/prompt-editor">
            <Plus className="h-4 w-4" /> Append Prompt
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved prompts..." className="h-12 pl-11" />
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_110px_140px_1fr_120px] gap-4 border-b bg-secondary/60 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground max-lg:hidden">
          <span>Prompt</span>
          <span>Status</span>
          <span>Version</span>
          <span>Targets</span>
          <span>Action</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">Loading prompts...</div>
        ) : error ? (
          <div className="px-5 py-10 text-sm text-destructive">Unable to load prompts.</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">No prompts yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Append the first detailed prompt from the website builder.</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid gap-4 border-b px-5 py-4 last:border-0 lg:grid-cols-[1.4fr_110px_140px_1fr_120px] lg:items-center">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.name}</div>
                <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.body}</div>
              </div>
              <Badge className="w-fit">{row.status}</Badge>
              <div className="text-sm text-muted-foreground">v{row.version}</div>
              <div className="flex flex-wrap gap-2">
                {row.framework_targets.slice(0, 3).map((target) => (
                  <Badge key={target}>
                    {target}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => copyPrompt(row)} className="w-fit">
                <Clipboard className="h-4 w-4" /> Copy
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

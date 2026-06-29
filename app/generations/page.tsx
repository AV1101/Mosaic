"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, History, Search, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/features/auth/require-auth";
import { apiFetch } from "@/services/api-client";
import { formatModelForDisplay } from "@/lib/model-utils";

type Generation = {
  id: number;
  provider: string;
  model: string;
  prompt_input: string;
  output_code: string;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function GenerationsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <GenerationsContent />
      </RequireAuth>
    </AppShell>
  );
}

function GenerationsContent() {
  const [query, setQuery] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["generations"],
    queryFn: () => apiFetch<Generation[]>("/generations"),
    retry: false
  });

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((item) => [item.prompt_input, item.output_code, item.model].some((value) => value.toLowerCase().includes(needle)));
  }, [data, query]);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success("Generated code copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Generations</h1>
          <p className="mt-2 text-muted-foreground">Real OpenAI results saved from your generation runs.</p>
        </div>
        <Button asChild>
          <Link href="/generate">
            <WandSparkles className="h-4 w-4" /> Generate
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search generated code or prompts..." className="h-12 pl-11" />
      </div>

      {isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading generations...</Card>
      ) : error ? (
        <Card className="p-8 text-sm text-destructive">Unable to load generations.</Card>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-14 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <History className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">No generations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">Generate a section with GPT-4o and it will appear here.</p>
          <Button asChild className="mt-6">
            <Link href="/generate">
              <WandSparkles className="h-4 w-4" /> Generate a section
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>OpenAI</span>
                    <span>{formatModelForDisplay(item.model)}</span>
                    <span>{formatDate(item.created_at)}</span>
                    <span>in {item.prompt_tokens.toLocaleString()}</span>
                    <span>out {item.completion_tokens.toLocaleString()}</span>
                    <span>total {item.tokens_used.toLocaleString()} tokens</span>
                  </div>
                  <h2 className="mt-2 line-clamp-2 font-medium">{item.prompt_input}</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyCode(item.output_code)} className="w-fit">
                  <Clipboard className="h-4 w-4" /> Copy
                </Button>
              </div>
              <pre className="code-scrollbar max-h-96 overflow-auto bg-slate-950 p-5 text-sm leading-6 text-sky-200">
                <code>{item.output_code}</code>
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

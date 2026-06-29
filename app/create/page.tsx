import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LayoutTemplate, Mail, Package } from "lucide-react";

export default function CreatePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create</h1>
          <p className="mt-2 text-muted-foreground">Choose what you want to generate.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/create/page"
            className="group flex flex-col gap-5 rounded-2xl border bg-card p-8 shadow-soft transition hover:border-primary/40 hover:shadow-glow"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary transition group-hover:bg-primary/10">
              <LayoutTemplate className="h-7 w-7 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Page Generator</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Build a full landing page by combining header, hero, sections, and footer templates.
              </p>
            </div>
            <span className="mt-auto text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
              Get started →
            </span>
          </Link>

          <Link
            href="/create/component"
            className="group flex flex-col gap-5 rounded-2xl border bg-card p-8 shadow-soft transition hover:border-primary/40 hover:shadow-glow"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary transition group-hover:bg-primary/10">
              <Package className="h-7 w-7 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Component</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Create custom components including forms, input fields, and other UI elements.
              </p>
            </div>
            <span className="mt-auto text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
              Get started →
            </span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

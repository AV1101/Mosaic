"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-6 transition-colors">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/80 p-12 text-center shadow-2xl backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-600">
          AI-Powered Design
        </p>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Welcome to <span className="text-cyan-600">Mosaic!</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Generate beautiful, production-ready UI sections with the power of AI.
        </p>

        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="rounded-2xl px-8 py-6 text-base font-medium shadow-lg shadow-cyan-500/20"
          >
            <Link href="/marketplace">Explore!</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
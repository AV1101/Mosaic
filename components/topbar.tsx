"use client";

import Link from "next/link";
import { BookOpen, Compass, History, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const mobileItems = [
  { label: "Explore", href: "/marketplace", icon: Compass },
  { label: "Generations", href: "/generations", icon: History },
  { label: "Prompts", href: "/prompts", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/75 backdrop-blur-xl lg:border-b-0 lg:bg-transparent">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
          <Compass className="h-5 w-5" /> Mosaic
        </Link>
        <div className="hidden text-sm text-muted-foreground lg:block">Design smarter. Generate faster.</div>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          {/* Authentication controls removed. */}
          {/* <Button asChild variant="underline" size="sm">
            <Link href="/library">Components</Link>
          </Button>
          <Button asChild variant="underline" size="sm">
            <Link href="/marketplace">Templates</Link>
          </Button> */}
        </div>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
        {mobileItems.map((item) => (
          <Button key={item.href} asChild variant="outline" size="sm" className="shrink-0">
            <Link href={item.href}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </header>
  );
}

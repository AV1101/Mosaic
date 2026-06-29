"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Image,
  CpuIcon,
  History,
  MailCheck,
  PlusCircle,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Brand Websites", href: "/marketplace", icon: Image },
  { label: "Brand Websites v2", href: "/design-websites", icon: Image },
  { label: "Component Library", href: "/library", icon: Sparkles },
  { label: "My Generations", href: "/generations", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 lg:flex lg:flex-col",
        "transition-all duration-200",
        collapsed ? "w-[6rem]" : "w-[18rem]"
      )}
    >
      {/* Glass inner panel — small inset so it doesn't bleed into topbar border */}
      <div className="glass m-2 flex flex-1 flex-col rounded-2xl overflow-hidden">
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 px-3 py-4 transition-all",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <CpuIcon className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="overflow-hidden whitespace-nowrap font-semibold text-sm">
              Mosaic
            </span>
          )}
        </Link>

        {/* Nav links */}
        <nav className="flex-1 space-y-2 px-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition",
                  collapsed && "justify-center",
                  active
                    ? "bg-foreground text-background shadow-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="overflow-hidden whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mx-2 mb-3 flex items-center justify-center rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

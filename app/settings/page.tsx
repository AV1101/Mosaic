"use client";

import { ChevronDown, Download, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState<string>("GPT-4o");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("ai_model");
    if (stored) {
      setSelectedModel(stored);
    }
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!modelMenuRef.current) return;
      if (!modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("ai_model", model);
    setIsModelMenuOpen(false);
  };

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">OpenAI provider, model, export, and interface settings.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold">Appearance</h2>
            <div className="mt-5 flex items-center justify-between rounded-2xl border p-4">
              <span className="text-sm text-muted-foreground">Theme switcher</span>
              <ThemeToggle />
            </div>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold">AI Provider & Model</h2>
            <div className="mt-5 grid gap-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-muted-foreground">Provider:</label>
                  <p className="h-12 px-1 text-sm leading-[3rem]">OpenAI</p>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-muted-foreground">Model:</label>
                  <div ref={modelMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsModelMenuOpen((open) => !open)}
                      className="flex h-12 w-full items-center justify-between rounded-2xl border bg-background px-4 text-left text-sm"
                    >
                      <span>{selectedModel}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isModelMenuOpen ? "rotate-180" : "rotate-0"}`} />
                    </button>
                    {isModelMenuOpen ? (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border bg-background shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleModelChange("GPT-4o")}
                          className="block w-full px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          GPT-4o
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModelChange("GPT-5.4")}
                          className="block w-full px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          GPT-5.4
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </Card>
          {/* <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold">Export Settings</h2>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4" /> Reset Defaults
              </Button>
            </div>
          </Card> */}
        </div>
      </div>
    </AppShell>
  );
}

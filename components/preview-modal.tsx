"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GenerationPanel } from "@/components/generation-panel";
import { InputConfigPanel, type InputConfigValues } from "@/components/input-config-panel";
import { apiFetch } from "@/services/api-client";
import type { SectionItem } from "@/types/section";

type FrameData = {
  id: number;
  brand_name: string;
  preview_image: string | null;
};

type PreviewModalProps = {
  section: SectionItem;
  backHref?: string;
  templatesEndpoint?: string;
  templateSource?: string;
  brandsEndpoint?: string;
  useTemplateFrames?: boolean;
};

export function PreviewModal({
  section,
  backHref = "/marketplace",
  templatesEndpoint = "/templates",
  templateSource = "templates",
  brandsEndpoint = "/brands",
  useTemplateFrames = true,
}: PreviewModalProps) {
  const [inputConfig, setInputConfig] = useState<InputConfigValues>({
    textFields: [],
    iconOnlySlots: [],
    iconTextSlots: [],
  });

  const handleConfigChange = useCallback((values: InputConfigValues) => {
    setInputConfig(values);
  }, []);

  const imageCardRef = useRef<HTMLDivElement>(null);
  const [imageCardHeight, setImageCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = imageCardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setImageCardHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch all brand frames for this template
  const { data: allFrames = [] } = useQuery<FrameData[]>({
    queryKey: ["template-frames", templatesEndpoint, section.name],
    queryFn: () =>
      apiFetch<FrameData[]>(`${templatesEndpoint}/${encodeURIComponent(section.name)}/frames`),
    staleTime: 30_000,
    enabled: useTemplateFrames,
  });

  const [activeBrandName, setActiveBrandName] = useState(section.brandName ?? "");

  // Once frames load, ensure activeBrandName is valid
  useEffect(() => {
    if (allFrames.length > 0 && !allFrames.find((f) => f.brand_name === activeBrandName)) {
      setActiveBrandName(allFrames[0].brand_name);
    }
  }, [allFrames, activeBrandName]);

  const activeFrame = allFrames.find((f) => f.brand_name === activeBrandName);
  const previewImageSrc = useTemplateFrames
    ? (activeFrame?.preview_image ?? section.previewImage)
    : section.previewImage;

  const hasInputFields = section.textOnly > 0 || section.iconOnly > 0 || section.iconText > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" /> Back to templates
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{section.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{section.description}</p>
        </div>
      </div>

      {/* Preview image + config panel */}
      <div className={`flex gap-4 items-start ${!hasInputFields ? "" : ""}`}>
        {/* Preview image card */}
        <div
          ref={imageCardRef}
          className={`glass overflow-hidden rounded-2xl border border-white/10 ${
            hasInputFields ? "w-3/5" : "w-full"
          }`}
        >
          <div className="aspect-[16/9] overflow-hidden bg-white">
            {previewImageSrc ? (
              <img
                src={previewImageSrc}
                alt={`${section.name} preview`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>
        </div>

        {/* Input config card */}
        {hasInputFields && (
          <div
            className="glass flex w-2/5 flex-col overflow-hidden rounded-2xl border border-white/10"
            style={imageCardHeight ? { height: `${imageCardHeight}px` } : { minHeight: "320px" }}
          >
            <div className="shrink-0 border-b border-white/10 px-5 py-4">
              <h3 className="font-semibold">Input Configuration</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fill in the values the AI will use to generate your page.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <InputConfigPanel
                textOnly={section.textOnly}
                iconOnly={section.iconOnly}
                iconText={section.iconText}
                onChange={handleConfigChange}
                labels={section.fieldLabels}
              />
            </div>
          </div>
        )}
      </div>

      <GenerationPanel
        initialPrompt={section.promptTemplate || ""}
        templateName={section.name}
        imageField={section.imageField}
        inputConfig={inputConfig}
        forcedBrandName={activeBrandName || undefined}
        brandsEndpoint={brandsEndpoint}
        templateSource={templateSource}
      />
    </div>
  );
}

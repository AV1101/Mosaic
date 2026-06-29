"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/services/api-client";
import type { InputConfigValues } from "@/components/input-config-panel";
import { getSelectedModel } from "@/lib/model-utils";

type GenerationResponse = {
  id: number;
  prompt_input: string;
  output_code: string;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
};

type Brand = {
  id: number;
  brand_name: string;
};

type TemplateFrame = {
  id: number;
  brand_name: string;
};

function ImageUrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-muted-foreground">{label}</label>
      <Input
        value={value}
        placeholder="https://…  paste a public image URL"
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
      {value && (
        <img
          src={value}
          alt={label}
          className="max-h-20 rounded-lg object-contain"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          onLoad={(e) => { e.currentTarget.style.display = ""; }}
        />
      )}
    </div>
  );
}

export function GenerationPanel({
  initialPrompt = "",
  templateName,
  imageField = 0,
  inputConfig,
  forcedBrandName,
  brandsEndpoint = "/brands",
  templateSource = "templates",
  useGlobalBrands = false,
}: {
  initialPrompt?: string;
  templateName?: string;
  imageField?: number;
  inputConfig?: InputConfigValues;
  forcedBrandName?: string;
  brandsEndpoint?: string;
  templateSource?: string;
  useGlobalBrands?: boolean;
}) {
  const [prompt] = useState(initialPrompt);
  const [selectedBrand, setSelectedBrand] = useState(forcedBrandName ?? "");
  const [framework, setFramework] = useState("");
  const [brandImageUrls, setBrandImageUrls] = useState<string[]>(() =>
    Array(imageField).fill("")
  );

  const templateFramesEndpoint = templateSource === "design-websites" ? "/design-templates" : "/templates";

  const {
    data: templateFrames = [],
    isLoading: templateFramesLoading,
    error: templateFramesError,
  } = useQuery({
    queryKey: ["template-frames-for-brands", templateFramesEndpoint, templateName],
    queryFn: () =>
      apiFetch<TemplateFrame[]>(
        `${templateFramesEndpoint}/${encodeURIComponent(templateName || "")}/frames`
      ),
    retry: false,
    enabled: Boolean(templateName) && !useGlobalBrands,
  });

  const {
    data: brands = [],
    isLoading: brandsLoading,
    error: brandsError,
  } = useQuery({
    queryKey: ["brands", brandsEndpoint],
    queryFn: () => apiFetch<Brand[]>(brandsEndpoint),
    retry: false,
    enabled: useGlobalBrands || !templateName,
  });

  const availableBrands = useMemo(() => {
    if (!useGlobalBrands && templateFrames.length > 0) {
      return Array.from(new Set(templateFrames.map((frame) => frame.brand_name).filter(Boolean)));
    }
    return brands.map((brand) => brand.brand_name);
  }, [useGlobalBrands, templateFrames, brands]);

  const loadingBrandOptions = useGlobalBrands || !templateName ? brandsLoading : templateFramesLoading;
  const brandOptionsError = useGlobalBrands || !templateName ? brandsError : templateFramesError;

  useEffect(() => {
    if (forcedBrandName && availableBrands.includes(forcedBrandName) && selectedBrand !== forcedBrandName) {
      setSelectedBrand(forcedBrandName);
      return;
    }

    if (!selectedBrand && availableBrands.length > 0) {
      setSelectedBrand(availableBrands[0]);
      return;
    }

    if (selectedBrand && availableBrands.length > 0 && !availableBrands.includes(selectedBrand)) {
      setSelectedBrand(availableBrands[0]);
    }
  }, [availableBrands, selectedBrand, forcedBrandName]);

  const [output, setOutput] = useState("");
  const [usage, setUsage] = useState<{ input: number; output: number; total: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setIsGenerating(true);
    setUsage(null);
    try {
      const result = await apiFetch<GenerationResponse>("/generations", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          brand_name: selectedBrand,
          template_name: templateName,
          provider: "openai",
          model: getSelectedModel(),
          tokens: {},
          metadata: {
            brand_name: selectedBrand,
            template_name: templateName,
            framework: framework,
            input_config: inputConfig
              ? {
                  text_fields: inputConfig.textFields.filter((v) => v.trim() !== ""),
                  icon_only_slots: inputConfig.iconOnlySlots,
                  icon_text_slots: inputConfig.iconTextSlots,
                  table_config: inputConfig.tableConfig,
                  image_urls: brandImageUrls.filter(Boolean),
                }
              : undefined,
            template_source: templateSource,
          },
        }),
      });
      setOutput(result.output_code);
      setUsage({
        input: result.prompt_tokens,
        output: result.completion_tokens,
        total: result.tokens_used,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        {/* HEADER */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Brand Configuration</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Select a brand and configure content inputs. The Figma design reference is resolved automatically from the template.
          </p>
        </div>

        {/* CONFIG */}
        <div className="grid gap-6">
          <section className="rounded-2xl border border-white/10 bg-card p-6">
            {/* Brand */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Brand</label>
              <>
              <p className="text-sm text-red-500">
                Please note: The color in the preview image is for reference only, the color of the page will be developed with your selected brand.
              </p>  
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  disabled={loadingBrandOptions || availableBrands.length === 0}
                  className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm"
                >
                  {loadingBrandOptions ? (
                    <option>Loading brands...</option>
                  ) : availableBrands.length > 0 ? (
                    availableBrands.map((brandName) => (
                      <option key={brandName} value={brandName}>
                        {brandName}
                      </option>
                    ))
                  ) : (
                    <option>No brands found</option>
                  )}
                </select>
                {brandOptionsError && (
                  <p className="mt-2 text-sm text-red-500">
                    Unable to load brands from the database.
                  </p>
                )}
              </>
            
            </div>

            {/* Framework */}
            <div className="mt-6">
              <label className="mb-2 block text-sm text-muted-foreground">Code Framework</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm"
              >
                <option value="">Select a framework</option>
                <option value="react-tailwind">React + Tailwind</option>
                <option value="html">HTML</option>
                <option value="angular">Angular</option>
                <option value="flutter-dart">Flutter + DART</option>
              </select>
            </div>

            {/* Image URL fields */}
            {imageField > 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Image URLs
                  <span className="ml-2 font-normal text-xs text-muted-foreground">
                    paste a public link (Unsplash, Cloudinary, etc.)
                  </span>
                </p>
                {Array.from({ length: imageField }, (_, i) => (
                  <ImageUrlField
                    key={i}
                    label={`image${i + 1}`}
                    value={brandImageUrls[i]}
                    onChange={(url) => {
                      const updated = [...brandImageUrls];
                      updated[i] = url;
                      setBrandImageUrls(updated);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onClick={generate}
            disabled={isGenerating || !selectedBrand}
            size="lg"
            className="h-12 px-8 text-base"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate AI Prompt"}
          </Button>
        </div>

        {/* OUTPUT */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#050816] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Compiled AI Prompt</h3>
              <p className="text-sm text-muted-foreground">
                Ready to paste into GitHub Copilot (with Figma MCP enabled).
              </p>
              {usage && (
                <p className="mt-1 text-xs text-slate-400">
                  Input {usage.input.toLocaleString()} | Output {usage.output.toLocaleString()} | Total {usage.total.toLocaleString()} tokens
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={copyPrompt} disabled={!output}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy Prompt"}
            </Button>
          </div>
          <Textarea
            value={output || "Your compiled AI prompt will appear here after generation."}
            readOnly
            className="min-h-[320px] border-white/10 bg-[#050816] font-mono text-sm leading-7 tracking-[0.01em] text-slate-100 placeholder:text-slate-500 selection:bg-primary/30"
          />

        </section>
      </motion.div>
    </div>
  );
}

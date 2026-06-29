"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/features/auth/require-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/services/api-client";
import { InputConfigPanel, type InputConfigValues, type IconSlotValue, type IconTextSlotValue } from "@/components/input-config-panel";
import { getSelectedModel } from "@/lib/model-utils";

const defaultTokens = {
  colors: {
    primary: "#6d5dfc",
    accent: "#8b5cf6",
    surface: "#ffffff",
  },

  typography: {
    font: "Inter",
  },

  radius: {
    cards: "24px",
    buttons: "18px",
  },

  spacing: {
    section: "96px",
    gutter: "24px",
  },

  layout: {
    container: "1180px",
  },

  theme: "Dark",
};

type TemplateLibraryItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: string;
  preview: string;
  textOnly: number;
  iconOnly: number;
  iconText: number;
  imageField: number;
};

type TemplateApiItem = {
  id: number;
  name: string;
  slug: string;
  type: string;
  category: string;
  preview_image?: string | null;
  layout?: Record<string, any>;
  spacing?: Record<string, any>;
  typography?: Record<string, any>;
  components?: Record<string, any>;
  responsive_rules?: Record<string, any>;
  description?: string | null;
  tags?: string[];
  text_only?: number;
  icon_only?: number;
  icon_text?: number;
  image_field?: number;
};

type BrandApiItem = {
  id: number;
  brand_name: string;
};

type TemplateInputConfig = {
  textFields: string[];
  iconOnlySlots: IconSlotValue[];
  iconTextSlots: IconTextSlotValue[];
  imageUrls: string[];
};

type ComponentLibrary = {
  headers: TemplateLibraryItem[];
  subheaders: TemplateLibraryItem[];
  heroes: TemplateLibraryItem[];
  sections: TemplateLibraryItem[];
  footers: TemplateLibraryItem[];
};

type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

const emptyComponentLibrary: ComponentLibrary = {
  headers: [],
  subheaders: [],
  heroes: [],
  sections: [],
  footers: [],
};

function buildComponentLibrary(templates: TemplateApiItem[]): ComponentLibrary {
  const items = templates.map((template) => ({
    id: String(template.id),
    name: template.name,
    slug: template.slug,
    type: template.type,
    category: template.category,
    preview: template.preview_image || "",
    textOnly: template.text_only ?? 0,
    iconOnly: template.icon_only ?? 0,
    iconText: template.icon_text ?? 0,
    imageField: template.image_field ?? 0,
  }));

  const groupValue = (item: TemplateLibraryItem) =>
    `${item.type || ""} ${item.category || ""}`.toLowerCase();

  const normalizedGroupValue = (item: TemplateLibraryItem) =>
    groupValue(item).replace(/[^a-z0-9]+/g, " ").trim();

  const isSubheader = (item: TemplateLibraryItem) => {
    const raw = groupValue(item);
    const normalized = normalizedGroupValue(item);
    return (
      raw.includes("subheader") ||
      raw.includes("sub heading") ||
      raw.includes("sub-heading") ||
      normalized.includes("sub header")
    );
  };

  return {
    headers: items.filter(
      (item) =>
        groupValue(item).includes("header") &&
        !isSubheader(item)
    ),
    subheaders: items.filter((item) => isSubheader(item)),
    heroes: items.filter((item) => groupValue(item).includes("hero")),
    sections: items.filter(
      (item) =>
        !groupValue(item).includes("header") &&
        !isSubheader(item) &&
        !groupValue(item).includes("hero") &&
        !groupValue(item).includes("footer")
    ),
    footers: items.filter((item) => groupValue(item).includes("footer")),
  };
}

export default function CreateTemplatePage() {
  return (
    <AppShell>
      <RequireAuth roles={["admin", "designer"]}>
        <TemplateComposer />
      </RequireAuth>
    </AppShell>
  );
}

function TemplateComposer() {
  const [step, setStep] = useState(1);
  const [sectionSelectionNonce, setSectionSelectionNonce] = useState(0);

  const [form, setForm] = useState({
    template_name: "Healthcare Landing Page",

    brand_name: "",

    theme: "Dark",

    tokens: defaultTokens,

    header_component: "",
    subheader_component: "",
    hero_component: "",
    sections: [] as string[],
    footer_component: "",
  });

  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [isFetchingBrands, setIsFetchingBrands] = useState(false);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
  const [brands, setBrands] = useState<BrandApiItem[]>([]);
  const [allTemplates, setAllTemplates] = useState<TemplateApiItem[]>([]);
  const [componentLibrary, setComponentLibrary] = useState<ComponentLibrary>(
    emptyComponentLibrary
  );
  const [heroTemplate, setHeroTemplate] = useState<any>(null);
  const [structureError, setStructureError] = useState("");
  const [editingItem, setEditingItem] = useState<TemplateLibraryItem | null>(null);
  const [inputConfigs, setInputConfigs] = useState<Record<string, TemplateInputConfig>>({});
  const [sectionSelectionTokens, setSectionSelectionTokens] = useState<string[]>([]);

  function getOrderedPageTokens(): string[] {
    const ordered: string[] = [];
    if (form.header_component) ordered.push(`header:${form.header_component}`);
    if (form.subheader_component) ordered.push(`subheader:${form.subheader_component}`);
    if (form.hero_component) ordered.push(`hero:${form.hero_component}`);
    ordered.push(...sectionSelectionTokens);
    if (form.footer_component) ordered.push(`footer:${form.footer_component}`);
    return ordered;
  }

  function getSelectionOrderNumber(token: string): number | null {
    const idx = getOrderedPageTokens().findIndex((t) => t === token);
    return idx >= 0 ? idx + 1 : null;
  }

  function updateToken(
    section: string,
    key: string,
    value: string
  ) {
    setForm((current) => ({
      ...current,

      tokens: {
        ...current.tokens,

        [section]: {
          ...(current.tokens as any)[section],
          [key]: value,
        },
      },
    }));
  }

  async function fetchBrand(name: string) {
    if (!name) return;

    setIsFetchingBrand(true);

    try {
      const brand = await apiFetch<{
        brand_name: string;
        colors: Record<string, any>;
        typography: Record<string, any>;
        effects: Record<string, any>;
        other_tokens: Record<string, any>;
        hero_template: any;
      }>(`/brands/${encodeURIComponent(name)}`);

      setForm((current) => ({
        ...current,
        brand_name: brand.brand_name,
        tokens: {
          ...defaultTokens,
          colors: { ...defaultTokens.colors, ...(brand.colors ?? {}) },
          typography: { ...defaultTokens.typography, ...(brand.typography ?? {}) },
          radius: { ...defaultTokens.radius, ...(brand.other_tokens?.radius ?? {}) },
          spacing: { ...defaultTokens.spacing, ...(brand.other_tokens?.spacing ?? {}) },
          layout: { ...defaultTokens.layout, ...(brand.other_tokens?.layout ?? {}) },
        },
        hero_component: brand.hero_template?.id
          ? String(brand.hero_template.id)
          : current.hero_component,
      }));
      setHeroTemplate(brand.hero_template || null);
    } catch (error) {
      console.error("Failed to load brand", error);
    } finally {
      setIsFetchingBrand(false);
    }
  }

  async function fetchBrands() {
    setIsFetchingBrands(true);

    try {
      const items = await apiFetch<BrandApiItem[]>("/brands");
      setBrands(items);

      setForm((current) => {
        if (items.length === 0) return current;

        const currentExists = items.some(
          (brand) => brand.brand_name === current.brand_name
        );

        return {
          ...current,
          brand_name: currentExists ? current.brand_name : items[0].brand_name,
        };
      });
    } catch (error) {
      console.error("Failed to load brands", error);
    } finally {
      setIsFetchingBrands(false);
    }
  }

  async function fetchTemplates(brandName: string) {
    setIsFetchingTemplates(true);

    try {
      const query = brandName ? `?brand=${encodeURIComponent(brandName)}` : "";
      const templates = await apiFetch<TemplateApiItem[]>(`/templates${query}`);

      setAllTemplates(templates);
      setComponentLibrary(buildComponentLibrary(templates));
    } catch (error) {
      console.error("Failed to load templates", error);
      setAllTemplates([]);
      setComponentLibrary(emptyComponentLibrary);
    } finally {
      setIsFetchingTemplates(false);
    }
  }

  function addSection(id: string) {
    if (form.footer_component) {
      return;
    }
    const token = `section:${id}:${sectionSelectionNonce + 1}`;
    setSectionSelectionNonce((v) => v + 1);
    setForm((current) => ({
      ...current,
      sections: [...current.sections, id],
    }));
    setSectionSelectionTokens((current) => [...current, token]);
  }

  function removeSectionAt(index: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter((_, i) => i !== index),
    }));
    setSectionSelectionTokens((current) => current.filter((_, i) => i !== index));
  }

  function selectHeader(id: string) {
    setForm((current) => ({ ...current, header_component: id }));
  }

  function selectSubheader(id: string) {
    setForm((current) => ({ ...current, subheader_component: id }));
  }

  function selectHero(id: string) {
    setForm((current) => ({ ...current, hero_component: id }));
  }

  function selectFooter(id: string) {
    setForm((current) => ({ ...current, footer_component: id }));
  }

  function validateStructure() {
    if (componentLibrary.headers.length > 0 && !form.header_component) {
      setStructureError("Please select a header component.");
      return false;
    }

    if (componentLibrary.heroes.length > 0 && !form.hero_component) {
      setStructureError("Please select a hero component.");
      return false;
    }

    if (componentLibrary.footers.length > 0 && !form.footer_component) {
      setStructureError("Please select a footer component.");
      return false;
    }

    if (componentLibrary.sections.length > 0 && form.sections.length === 0) {
      setStructureError("Please select at least one section.");
      return false;
    }

    setStructureError("");
    return true;
  }

  async function generatePrompt() {
    setIsGeneratingPrompt(true);
    setTokenUsage(null);

    try {
      // Build input configs for every selected component, keyed by template ID string
      const componentInputConfigs: Record<string, object> = {};
      const allSelectedIds = [
        form.header_component,
        form.subheader_component,
        form.hero_component,
        ...form.sections,
        form.footer_component,
      ].filter(Boolean);

      for (const id of allSelectedIds) {
        const config = inputConfigs[id];
        if (config) {
          componentInputConfigs[id] = {
            text_fields: config.textFields,
            icon_only_slots: config.iconOnlySlots,
            icon_text_slots: config.iconTextSlots,
            image_urls: config.imageUrls,
          };
        }
      }

      const result = await apiFetch<{ compiled_prompt: string } & TokenUsage>(
        "/template-generation",
        {
          method: "POST",
          body: JSON.stringify({
            provider: "OpenAI",
            model: getSelectedModel(),
            payload: {
              template_name: form.template_name,
              brand_name: form.brand_name,
              industry: form.brand_name,
              theme: form.theme,
              tokens: form.tokens,
              structure: {
                header: form.header_component,
                subheader: form.subheader_component,
                hero: form.hero_component,
                sections: form.sections,
                footer: form.footer_component,
                page_order: getOrderedPageTokens()
                  .map((token) => token.split(":")[1] || "")
                  .filter(Boolean),
              },
              component_input_configs: componentInputConfigs,
            },
          }),
        }
      );

      setCompiledPrompt(result.compiled_prompt);
      setTokenUsage({
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        total_tokens: result.total_tokens,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPrompt(false);
    }
  }

    function copyPrompt() {
      if (!compiledPrompt) return;

      try {
        navigator.clipboard.writeText(compiledPrompt);
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error("Copy failed", error);
      }
    }

  function saveTemplate() {
    setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2000);
  }

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (form.brand_name) {
      fetchTemplates(form.brand_name);
      fetchBrand(form.brand_name);
    }
  }, [form.brand_name]);

  const steps = [
    "Brand & Theme",
    "Compose Template",
    "Review",
  ];

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Create Template
        </h1>

        <p className="mt-2 text-muted-foreground">
          Build AI-ready website templates using
          composable sections and tokenized design
          systems.
        </p>
      </div>

      {/* STEPS */}

      <div className="flex gap-2 overflow-x-auto">
        {steps.map((label, index) => {
          const targetStep = index + 1;
          const isDisabled = targetStep > step;

          return (
            <button
              key={label}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && setStep(targetStep)}
              className={`rounded-full border px-5 py-2 text-sm transition ${
                step === targetStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDisabled
                  ? "border-white/10 bg-background text-muted-foreground cursor-not-allowed"
                  : "border-white/10 bg-background hover:border-white/20"
              }`}
            >
              {targetStep}. {label}
            </button>
          );
        })}
      </div>

      {/* STEP 1 */}

{step === 1 && (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-6"
  >
    <div className="grid gap-6">
      {/* LEFT */}

      <section className="rounded-2xl border border-white/10 bg-card p-6">
        <h2 className="text-xl font-semibold">
          Brand Configuration
        </h2>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">
              Template Name
            </label>

            <Input
              value={form.template_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  template_name:
                    e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-muted-foreground">
              Brand
            </label>

            <select
              value={form.brand_name}
              onChange={(e) => {
                setSectionSelectionNonce(0);
                setSectionSelectionTokens([]);
                setForm((current) => ({
                  ...current,
                  brand_name: e.target.value,
                  header_component: "",
                  subheader_component: "",
                  hero_component: "",
                  sections: [],
                  footer_component: "",
                }));
              }}
              disabled={isFetchingBrand || isFetchingBrands || brands.length === 0}
              className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm"
            >
              {isFetchingBrands ? (
                <option>Loading brands...</option>
              ) : brands.length > 0 ? (
                brands.map((brand) => (
                  <option key={brand.id} value={brand.brand_name}>
                    {brand.brand_name}
                  </option>
                ))
              ) : (
                <option>No brands found</option>
              )}
            </select>
          </div>

          {/*
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">
              Theme
            </label>

            <select
              value={form.theme}
              onChange={(e) =>
                setForm({
                  ...form,
                  theme: e.target.value,
                })
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm"
            >
              <option>Dark</option>
              <option>Light</option>
            </select>
          </div>
          */}
        </div>
      </section>

      {/*
      <section className="rounded-2xl border border-white/10 bg-card p-6">
        <h2 className="text-xl font-semibold">
          Brand Tokens
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Primary Color"
            value={
              form.tokens.colors.primary
            }
            onChange={(e) =>
              updateToken(
                "colors",
                "primary",
                e.target.value
              )
            }
          />

          <Input
            placeholder="Accent Color"
            value={
              form.tokens.colors.accent
            }
            onChange={(e) =>
              updateToken(
                "colors",
                "accent",
                e.target.value
              )
            }
          />

          <Input
            placeholder="Font Family"
            value={
              form.tokens.typography.font
            }
            onChange={(e) =>
              updateToken(
                "typography",
                "font",
                e.target.value
              )
            }
          />

          <Input
            placeholder="Container Width"
            value={
              form.tokens.layout.container
            }
            onChange={(e) =>
              updateToken(
                "layout",
                "container",
                e.target.value
              )
            }
          />

          <Input
            placeholder="Card Radius"
            value={
              form.tokens.radius.cards
            }
            onChange={(e) =>
              updateToken(
                "radius",
                "cards",
                e.target.value
              )
            }
          />

          <Input
            placeholder="Section Spacing"
            value={
              form.tokens.spacing.section
            }
            onChange={(e) =>
              updateToken(
                "spacing",
                "section",
                e.target.value
              )
            }
          />
        </div>
      </section>
      */}
    </div>
  </motion.div>
)}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-6 items-start"
        >
          {/* Main selectors column */}
          <div className="flex-1 min-w-0 space-y-8">
            {isFetchingTemplates && (
              <div className="rounded-2xl border border-white/10 bg-card p-5 text-sm text-muted-foreground">
                Loading templates...
              </div>
            )}

            <ComponentSelector
              title="Headers"
              required
              items={componentLibrary.headers}
              selected={form.header_component}
              selectedOrderNumber={
                form.header_component ? getSelectionOrderNumber(`header:${form.header_component}`) : null
              }
              onSelect={selectHeader}
              onEdit={setEditingItem}
            />

            <ComponentSelector
              title="Sub Headers"
              items={componentLibrary.subheaders}
              selected={form.subheader_component}
              selectedOrderNumber={
                form.subheader_component
                  ? getSelectionOrderNumber(`subheader:${form.subheader_component}`)
                  : null
              }
              onSelect={selectSubheader}
              onEdit={setEditingItem}
            />

            <ComponentSelector
              title="Hero Sections"
              required
              items={componentLibrary.heroes}
              selected={form.hero_component}
              selectedOrderNumber={
                form.hero_component ? getSelectionOrderNumber(`hero:${form.hero_component}`) : null
              }
              onSelect={selectHero}
              onEdit={setEditingItem}
            />

            <MultiComponentSelector
              title="Additional Sections"
              required
              items={componentLibrary.sections}
              selectedOrder={form.sections}
              selectedTokens={sectionSelectionTokens}
              getSelectionOrderNumber={getSelectionOrderNumber}
              disabled={Boolean(form.footer_component)}
              onAdd={addSection}
              onRemoveAt={removeSectionAt}
              onEdit={setEditingItem}
            />

            <div>
              <ComponentSelector
                title="Footers"
                required
                items={componentLibrary.footers}
                selected={form.footer_component}
                selectedOrderNumber={
                  form.footer_component ? getSelectionOrderNumber(`footer:${form.footer_component}`) : null
                }
                allowDeselect
                onSelect={selectFooter}
                onEdit={setEditingItem}
              />
              {form.footer_component && (
                <p className="mt-3 text-sm text-amber-400/80">
                  Footer selected — additional sections are locked. Deselect the footer to add more sections.
                </p>
              )}
            </div>

            {editingItem && (
              <TemplateEditModal
                item={editingItem}
                initialConfig={inputConfigs[editingItem.id]}
                onClose={() => setEditingItem(null)}
                onSave={(config) => {
                  setInputConfigs((prev) => ({ ...prev, [editingItem.id]: config }));
                }}
              />
            )}
          </div>

          {/* Live order panel */}
          <div className="w-64 shrink-0 sticky top-4">
            <PageOrderPanel
              orderedTokens={getOrderedPageTokens()}
              componentLibrary={componentLibrary}
            />
          </div>
        </motion.div>
      )}

      {/* STEP 3 */}

      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-white/10 bg-card p-6">
            <h2 className="text-2xl font-semibold">
              Template Review
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-medium">
                  Structure
                </h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    Header →{" "}
                    {form.header_component ||
                      "None"}
                  </div>

                  <div>
                    Sub Header -&gt;{" "}
                    {form.subheader_component ||
                      "None"}
                  </div>

                  <div>
                    Hero →{" "}
                    {form.hero_component ||
                      "None"}
                  </div>

                  <div>
                    Sections →{" "}
                    {form.sections.join(", ") ||
                      "None"}
                  </div>

                  <div>
                    Footer →{" "}
                    {form.footer_component ||
                      "None"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">
                  Brand
                </h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    Theme → Light
                  </div>

                  <div>
                  Brand →{" "}
                    {form.brand_name}
                  </div>

                  <div>
                    Font →{" "}
                    {form.tokens?.typography?.font ?? "—"}
                  </div>

                  {heroTemplate ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-background/60 p-4 text-sm">
                      <div className="font-medium">Loaded brand template:</div>
                      <div>{heroTemplate.name}</div>
                      <div className="text-muted-foreground">
                        {heroTemplate.description}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />

                <h3 className="font-medium">Generated AI Prompt</h3>
              </div>

              {tokenUsage && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Input {tokenUsage.input_tokens.toLocaleString()} | Output {tokenUsage.output_tokens.toLocaleString()} | Total {tokenUsage.total_tokens.toLocaleString()} tokens
                </p>
              )}

              <div className="mb-4 flex justify-end">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={generatePrompt}
                    disabled={isGeneratingPrompt}
                  >
                    {isGeneratingPrompt
                      ? "Generating..."
                      : "Generate AI Prompt"}
                  </Button>

                  <Button
                    onClick={copyPrompt}
                    disabled={!compiledPrompt}
                    className="ml-2"
                  >
                    {isCopied ? "Copied!" : "Copy Prompt"}
                  </Button>
                </div>
              </div>

              <Textarea
                readOnly
                className="min-h-[260px] border-white/10 bg-[#050816] font-mono text-sm text-slate-100"
                value={
                  compiledPrompt ||
                  "Your AI-generated template prompt will appear here."
                }
              />
            </div>
          </section>
        </motion.div>
      )}

      {/* FOOTER */}

      <div className="space-y-4">
        {structureError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {structureError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 2) {
                  const valid = validateStructure();

                  if (!valid) return;
                }

                setStep(step + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={saveTemplate}>
              <Check className="h-4 w-4" />
              {isSaved ? "Saved!" : "Save Template"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PageOrderPanel({
  orderedTokens,
  componentLibrary,
}: {
  orderedTokens: string[];
  componentLibrary: ComponentLibrary;
}) {
  const typeLabel: Record<string, string> = {
    header: "Header",
    subheader: "Sub Header",
    hero: "Hero",
    section: "Section",
    footer: "Footer",
  };

  const allItems = [
    ...componentLibrary.headers,
    ...componentLibrary.subheaders,
    ...componentLibrary.heroes,
    ...componentLibrary.sections,
    ...componentLibrary.footers,
  ];

  function resolveToken(token: string): { type: string; name: string } {
    const parts = token.split(":");
    const type = parts[0];
    const id = parts[1];
    const item = allItems.find((i) => i.id === id);
    return { type, name: item?.name ?? id };
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Page Order
      </h3>

      {orderedTokens.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No components selected yet. Select components from the left to build your page.
        </p>
      ) : (
        <ol className="space-y-2">
          {orderedTokens.map((token, index) => {
            const { type, name } = resolveToken(token);
            return (
              <li
                key={token}
                className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-background/50 px-3 py-2"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-tight">
                    {name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {typeLabel[type] ?? type}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ComponentSelector({
  title,
  items,
  selected,
  selectedOrderNumber,
  allowDeselect = false,
  required = false,
  onSelect,
  onEdit,
}: {
  title: string;
  items: TemplateLibraryItem[];
  selected: string;
  selectedOrderNumber: number | null;
  allowDeselect?: boolean;
  required?: boolean;
  onSelect: (id: string) => void;
  onEdit: (item: TemplateLibraryItem) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {title}
          {required && <span className="ml-1 text-red-500">*</span>}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-5 text-sm text-muted-foreground">
          No templates found for this group.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const active = selected === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border text-left transition ${
                  active
                    ? "border-primary pb-3 ring-2 ring-primary/20"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (allowDeselect && active) {
                      onSelect("");
                      return;
                    }
                    onSelect(item.id);
                    onEdit(item);
                  }}
                  className="w-full overflow-hidden rounded-2xl text-left"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-white">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`${item.name} preview`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="font-medium">{item.name}</div>
                  </div>
                </button>

                {active && selectedOrderNumber && (
                  <div className="flex items-center gap-2 px-3 pt-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-xs font-semibold text-primary">
                      {selectedOrderNumber}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MultiComponentSelector({
  title,
  items,
  selectedOrder,
  selectedTokens,
  getSelectionOrderNumber,
  disabled,
  required = false,
  onAdd,
  onRemoveAt,
  onEdit,
}: {
  title: string;
  items: TemplateLibraryItem[];
  selectedOrder: string[];
  selectedTokens: string[];
  getSelectionOrderNumber: (token: string) => number | null;
  disabled: boolean;
  required?: boolean;
  onAdd: (id: string) => void;
  onRemoveAt: (index: number) => void;
  onEdit: (item: TemplateLibraryItem) => void;
}) {
  const itemSelectionIndexes = new Map<string, number[]>();
  selectedOrder.forEach((id, index) => {
    const list = itemSelectionIndexes.get(id) ?? [];
    list.push(index);
    itemSelectionIndexes.set(id, list);
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {title}
          {required && <span className="ml-1 text-red-500">*</span>}
        </h2>
      </div>

      {disabled && (
        <p className="mb-4 text-sm text-muted-foreground">
          Additional sections are locked after selecting a footer.
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-5 text-sm text-muted-foreground">
          No templates found for this group.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const selectedIndexes = itemSelectionIndexes.get(item.id) ?? [];
            const active = selectedIndexes.length > 0;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border text-left transition ${
                  active
                    ? "border-primary pb-3 ring-2 ring-primary/20"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    onAdd(item.id);
                    onEdit(item);
                  }}
                  disabled={disabled}
                  className="w-full overflow-hidden rounded-2xl text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-white">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={`${item.name} preview`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="font-medium">{item.name}</div>
                  </div>
                </button>

                {active && (
                  <div className="flex flex-wrap items-center gap-2 px-3 pt-1">
                    {selectedIndexes.map((selectedIndex) => (
                      <button
                        key={`${item.id}-${selectedIndex}`}
                        type="button"
                        onClick={() => onRemoveAt(selectedIndex)}
                        title="Remove this occurrence"
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-xs font-semibold text-primary transition hover:bg-primary/25"
                      >
                        {getSelectionOrderNumber(selectedTokens[selectedIndex] ?? "") ?? selectedIndex + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TemplateEditModal({
  item,
  initialConfig,
  onClose,
  onSave,
}: {
  item: TemplateLibraryItem;
  initialConfig?: TemplateInputConfig;
  onClose: () => void;
  onSave: (config: TemplateInputConfig) => void;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>(() =>
    initialConfig?.imageUrls ?? Array(item.imageField).fill("")
  );
  const [configValues, setConfigValues] = useState<InputConfigValues | null>(() =>
    initialConfig
      ? {
          textFields: initialConfig.textFields,
          iconOnlySlots: initialConfig.iconOnlySlots,
          iconTextSlots: initialConfig.iconTextSlots,
        }
      : null
  );

  const hasConfigFields =
    item.textOnly > 0 || item.iconOnly > 0 || item.iconText > 0 || item.imageField > 0;

  function handleDone() {
    onSave({
      textFields: configValues?.textFields ?? [],
      iconOnlySlots: configValues?.iconOnlySlots ?? [],
      iconTextSlots: configValues?.iconTextSlots ?? [],
      imageUrls,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Preview image — always 16:9 */}
          <div className="aspect-[16/9] overflow-hidden rounded-xl bg-white">
            {item.preview ? (
              <img
                src={item.preview}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>

          {/* Input config fields */}
          {hasConfigFields && (
            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Customize Content
              </p>

              {(item.textOnly > 0 || item.iconOnly > 0 || item.iconText > 0) && (
                <InputConfigPanel
                  key={item.id}
                  textOnly={item.textOnly}
                  iconOnly={item.iconOnly}
                  iconText={item.iconText}
                  onChange={setConfigValues}
                />
              )}

              {item.imageField > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Image URLs</p>
                  {Array.from({ length: item.imageField }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <label className="block text-xs text-muted-foreground">
                        Image {i + 1}
                      </label>
                      <Input
                        value={imageUrls[i] ?? ""}
                        placeholder="https://…  paste a public image URL"
                        onChange={(e) =>
                          setImageUrls((prev) => {
                            const updated = [...prev];
                            updated[i] = e.target.value;
                            return updated;
                          })
                        }
                        className="font-mono text-xs"
                      />
                      {imageUrls[i] && (
                        <img
                          src={imageUrls[i]}
                          alt={`Image ${i + 1}`}
                          className="max-h-20 rounded-lg object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          onLoad={(e) => {
                            e.currentTarget.style.display = "";
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
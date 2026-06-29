"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, X } from "lucide-react";
import { apiFetch } from "@/services/api-client";
import { Input } from "@/components/ui/input";
import { InputConfigPanel, type InputConfigValues } from "@/components/input-config-panel";
import { FormConfigPanel, type FormConfigValues } from "@/components/form-config-panel";
import type { SectionItem } from "@/types/section";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ColorToken   = { id: number; name: string; tokens: Record<string, any> };
type TypoStyle    = { id: number; name: string; style: Record<string, any> };
type ButtonType   = "primary" | "secondary" | "tertiary";
type ButtonTheme  = "Light" | "Dark";
type TabsTheme    = "Light" | "Dark";
type ChatboxMode  = "Light" | "Dark";
type ChatboxSize  = "Small" | "Big";
type ChatboxStyle = "Neumorphic" | "Neumorphic - Gradient";
type UploadStyle  = "Style 1" | "Style 2";
type AlertToastSize = "Small" | "Big";
type AlertToastStatus = "" | "Success" | "Warning" | "Error" | "Hint";
type IconPosition = "none" | "left" | "right";
type IconResult   = { id: number; name: string; variants: string[] };
type TopNavMode = "Light" | "Dark";
type TopNavAlignment = "None" | "Center" | "Right" | "Off";
type TopNavGrid = "None" | "Desktop compact" | "Desktop medium" | "Desktop spacious" | "Mobile medium";
type SideNavMode = "Light" | "Dark";
type SideNavStyle = "Neumorphic" | "Flat";
type SideNavGridSpacing = "Compact" | "Medium";
type SideNavType = "Fixed" | "Floating";
type GenerationResponse = {
  compiled_prompt: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

// ---------------------------------------------------------------------------
// Icon search (minimal inline)
// ---------------------------------------------------------------------------

function IconSearch({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [query, setQuery]     = useState(value);
  const [results, setResults] = useState<IconResult[]>([]);
  const [open, setOpen]       = useState(false);
  const debounce              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapper               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      apiFetch<IconResult[]>(`/icons?search=${encodeURIComponent(query)}&limit=20`)
        .then(setResults).catch(() => setResults([]));
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapper} className="relative">
      <div className="relative">
        <Input
          value={query}
          placeholder="Search icon…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => query && setOpen(true)}
          className="h-9 pr-8 text-sm"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border bg-card shadow-lg">
          {results.map((icon) => (
            <li
              key={icon.id}
              onMouseDown={() => { onChange(icon.name); setQuery(icon.name); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
            >
              <span className="material-icons text-base leading-none">{icon.name}</span>
              <span>{icon.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function ComponentPreviewModal({
  section,
  onClose,
}: {
  section: SectionItem;
  onClose: () => void;
}) {
  const isButton = section.category?.toLowerCase() === "button";
  const isTable = section.category?.toLowerCase() === "table";
  const isTabs = section.category?.toLowerCase() === "tabs";
  const isChatbox = section.category?.toLowerCase() === "chatbox";
  const isForm = section.category?.toLowerCase() === "forms";
  const category = section.category?.toLowerCase() || "";
  const isUploads = category.includes("upload");
  const isAlertToast = [
    "alert",
    "alerts",
    "toast",
    "toasts",
    "alert message",
    "alert messages",
    "toast message",
    "toast messages",
  ].includes(category);
  const isModeOnlyComponent = [
    "slider",
    "progress bar",
    "progressbar",
    "query",
    "queries",
    "response",
    "responses",
  ].includes(category);
  const isTopNavigation = ["top navigation", "top-navigation", "top nav", "navbar", "navigation bar"].includes(category);
  const isSideNavigation = ["side navigation", "side-navigation", "side nav", "sidebar", "side menu"].includes(category);
  const hasInputFields = section.textOnly > 0 || section.iconOnly > 0 || section.iconText > 0;
  const hasConfigPanel = hasInputFields || isTable || isTabs || isChatbox || isModeOnlyComponent || isUploads || isAlertToast || isTopNavigation || isSideNavigation || isForm;

  // Token data (button only)
  const [colorTokens, setColorTokens] = useState<ColorToken[]>([]);
  const [typoList, setTypoList]       = useState<TypoStyle[]>([]);
  const [colorId, setColorId]         = useState(0);
  const [typoId, setTypoId]           = useState(0);
  const [typoUndId, setTypoUndId]     = useState(0);

  // Shared size config (all components)
  const [size, setSize]               = useState("large");
  const [type, setType]               = useState<ButtonType>("primary");
  const [theme, setTheme]             = useState<ButtonTheme>("Light");
  const [labelOn, setLabelOn]         = useState(true);
  const [label, setLabel]             = useState("");
  const [iconOn, setIconOn]           = useState(false);
  const [iconPos, setIconPos]         = useState<IconPosition>("left");
  const [iconName, setIconName]       = useState("");

  // General input config (non-button components with field slots)
  const [inputConfig, setInputConfig] = useState<InputConfigValues>({
    textFields: [],
    iconOnlySlots: [],
    iconTextSlots: [],
  });
  const handleConfigChange = useCallback((values: InputConfigValues) => {
    setInputConfig(values);
  }, []);

  // Form config
  const [formConfig, setFormConfig] = useState<FormConfigValues>({
    sectionName: "",
    fieldsPerRow: 2,
    fields: [],
  });
  const handleFormConfigChange = useCallback((values: FormConfigValues) => {
    setFormConfig(values);
  }, []);

  function toggleLabel() {
    if (labelOn && !iconOn) { setIconOn(true); }
    setLabelOn((v) => !v);
  }
  function toggleIcon() {
    if (iconOn && !labelOn) { setLabelOn(true); }
    setIconOn((v) => !v);
  }

  // Code output
  const [code, setCode]               = useState<string | null>(null);
  const [usage, setUsage]             = useState<{ input: number; output: number; total: number } | null>(null);
  const [loading, setLoading]         = useState(false);
  const [copied, setCopied]           = useState(false);

  // Tabs config (hardcoded, no DB)
  const [tabsMode, setTabsMode] = useState<TabsTheme>("Light");
  const [tabsCountInput, setTabsCountInput] = useState("");
  const [tabsCount, setTabsCount] = useState(0);
  const [tabsContent, setTabsContent] = useState<string[]>([]);
  const [tabsReady, setTabsReady] = useState(false);

  // Chatbox config (hardcoded, no DB)
  const [chatboxMode, setChatboxMode] = useState<ChatboxMode>("Light");
  const [chatboxSize, setChatboxSize] = useState<ChatboxSize>("Small");
  const [chatboxStyle, setChatboxStyle] = useState<ChatboxStyle>("Neumorphic");

  // Slider/Progress config (hardcoded, no DB)
  const [simpleMode, setSimpleMode] = useState<ButtonTheme>("Light");

  // Alert/Toast config (hardcoded, no DB)
  const [alertToastMode, setAlertToastMode] = useState<ButtonTheme>("Light");
  const [alertToastSize, setAlertToastSize] = useState<AlertToastSize>("Small");
  const [alertToastHasButton, setAlertToastHasButton] = useState(false);
  const [alertToastStatus, setAlertToastStatus] = useState<AlertToastStatus>("");
  const [alertToastMessage, setAlertToastMessage] = useState("");

  // Upload config (hardcoded, no DB)
  const [uploadMode, setUploadMode] = useState<ButtonTheme>("Light");
  const [uploadStyle, setUploadStyle] = useState<UploadStyle>("Style 1");
  const [uploadMaxSizeMb, setUploadMaxSizeMb] = useState(10);
  const [uploadDocToAdd, setUploadDocToAdd] = useState("pdf");
  const [uploadSupportedDocs, setUploadSupportedDocs] = useState<string[]>(["pdf"]);
  const [topNavMode, setTopNavMode] = useState<TopNavMode>("Light");
  const [topNavProfile, setTopNavProfile] = useState(false);
  const [topNavNotification, setTopNavNotification] = useState(false);
  const [topNavAlignment, setTopNavAlignment] = useState<TopNavAlignment>("None");
  const [topNavGrid, setTopNavGrid] = useState<TopNavGrid>("None");
  const [sideNavMode, setSideNavMode] = useState<SideNavMode>("Light");
  const [sideNavStyle, setSideNavStyle] = useState<SideNavStyle>("Neumorphic");
  const [sideNavGridSpacing, setSideNavGridSpacing] = useState<SideNavGridSpacing>("Compact");
  const [sideNavType, setSideNavType] = useState<SideNavType>("Fixed");
  const uploadDocumentOptions = [
    { value: "pdf", label: "PDF (.pdf)" },
    { value: "doc", label: "DOC (.doc)" },
    { value: "docx", label: "DOCX (.docx)" },
    { value: "txt", label: "TXT (.txt)" },
    { value: "rtf", label: "RTF (.rtf)" },
    { value: "csv", label: "CSV (.csv)" },
    { value: "xlsx", label: "XLSX (.xlsx)" },
    { value: "pptx", label: "PPTX (.pptx)" },
  ];

  function normalizeUploadMaxSize(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 10;
    return Math.max(10, Math.round(value / 10) * 10);
  }

  function handleAddUploadDocument() {
    setUploadSupportedDocs((prev) => (prev.includes(uploadDocToAdd) ? prev : [...prev, uploadDocToAdd]));
  }

  function handleRemoveUploadDocument(docType: string) {
    setUploadSupportedDocs((prev) => prev.filter((doc) => doc !== docType));
  }

  useEffect(() => {
    if (!isButton) return;
    const safe = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => []);
    Promise.all([
      safe(apiFetch<ColorToken[]>("/color-tokens")),
      safe(apiFetch<TypoStyle[]>("/typography")),
    ]).then(([colors, typos]) => {
      setColorTokens(colors);
      setTypoList(typos);
      if (colors.length) setColorId(colors[0].id);
      const btn = typos.find((t) => t.name === "Button");
      const und = typos.find((t) => t.name === "Button Underlined");
      if (typos.length) {
        setTypoId(btn?.id ?? typos[0].id);
        setTypoUndId(und?.id ?? btn?.id ?? typos[0].id);
      }
    });
  }, [isButton]);

  async function handleGenerate() {
    setLoading(true);
    setCode(null);
    setUsage(null);

    const applyGenerationResult = (res: GenerationResponse) => {
      setCode(res.compiled_prompt);
      setUsage({
        input: res.input_tokens,
        output: res.output_tokens,
        total: res.total_tokens,
      });
    };

    try {
      if (isButton) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: "button",
            config: {
              type,
              size,
              theme,
              has_label: labelOn,
              label: labelOn ? (label || "") : "",
              has_icon: iconOn,
              icon_position: iconOn ? iconPos : "none",
              icon_name: iconOn ? iconName : "",
            },
            color_token_id: colorId || null,
            typography_id: typoId || null,
            typography_underlined_id: typoUndId || null,
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isTabs) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: "tabs",
            config: {
              mode: tabsMode,
              no_of_tabs: tabsCount,
              tabs: tabsContent.map((content, index) => ({
                tab_number: index + 1,
                content,
              })),
            },
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isChatbox) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: "chatbox",
            config: {
              mode: chatboxMode,
              size: chatboxSize,
              style: chatboxStyle,
            },
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isModeOnlyComponent) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "component",
            config: {
              mode: simpleMode,
            },
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isUploads) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "uploads",
            config: {
              mode: uploadMode,
              style: uploadStyle,
              supported_documents: uploadSupportedDocs,
              max_size_mb: normalizeUploadMaxSize(uploadMaxSizeMb),
            },
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isAlertToast) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "alert",
            config: {
              mode: alertToastMode,
              size: alertToastSize,
              has_button: alertToastHasButton,
              status: alertToastStatus,
              message: alertToastMessage,
            },
            figma_frame_url: section.figmaFrameUrl || null,
          }),
        });
        applyGenerationResult(res);
      } else if (isTopNavigation) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "top navigation",
            config: {
              mode: topNavMode,
            },
            figma_frame_url: section.figmaFrameUrl || null,
            input_config: {
              top_navigation: {
                mode: topNavMode,
                profile_toggle: topNavProfile,
                notification_toggle: topNavNotification,
                navigation_alignment: topNavAlignment,
                grid: topNavGrid,
              },
            },
          }),
        });
        applyGenerationResult(res);
      } else if (isSideNavigation) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "side navigation",
            config: {
              mode: sideNavMode,
            },
            figma_frame_url: section.figmaFrameUrl || null,
            input_config: {
              side_navigation: {
                mode: sideNavMode,
                style: sideNavStyle,
                grid_spacing: sideNavGridSpacing,
                type: sideNavType,
              },
            },
          }),
        });
        applyGenerationResult(res);
      } else if (isForm) {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "form",
            config: {
              type: "primary",
              size,
              theme: "Light",
              has_label: false,
              label: "",
              has_icon: false,
              icon_position: "none",
              icon_name: "",
            },
            figma_frame_url: section.figmaFrameUrl || null,
            input_config: {
              section_name: formConfig.sectionName,
              fields_per_row: formConfig.fieldsPerRow,
              form_fields: formConfig.fields,
            },
          }),
        });
        applyGenerationResult(res);
      } else {
        const res = await apiFetch<GenerationResponse>("/component-generation", {
          method: "POST",
          body: JSON.stringify({
            component_type: section.category || "component",
            config: {
              type: "primary",
              size,
              theme: "Light",
              has_label: false,
              label: "",
              has_icon: false,
              icon_position: "none",
              icon_name: "",
            },
            figma_frame_url: section.figmaFrameUrl || null,
            input_config: {
              text_fields: inputConfig.textFields,
              icon_only_slots: inputConfig.iconOnlySlots,
              icon_text_slots: inputConfig.iconTextSlots,
              table_config: inputConfig.tableConfig,
            },
          }),
        });
        applyGenerationResult(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleTabsNext() {
    const parsed = Number.parseInt(tabsCountInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setTabsReady(false);
      setTabsCount(0);
      setTabsContent([]);
      return;
    }
    const safeCount = Math.min(parsed, 12);
    setTabsCount(safeCount);
    setTabsContent((prev) => Array.from({ length: safeCount }, (_, i) => prev[i] ?? ""));
    setTabsReady(true);
  }

  function handleTabContentChange(index: number, value: string) {
    setTabsContent((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---------------------------------------------------------------------------
  // Output area (shared between button and general)
  // ---------------------------------------------------------------------------
  const outputArea = (
    <div className="mt-auto border-t border-white/10 px-6 py-4 space-y-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || (isTabs && !tabsReady)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          : "Get Prompt"}
      </button>

      {code && (
        <div className="relative rounded-xl border border-white/10 bg-black/50">
          {usage && (
            <div className="border-b border-white/10 px-4 py-2 text-[11px] text-muted-foreground">
              Input {usage.input.toLocaleString()} | Output {usage.output.toLocaleString()} | Total {usage.total.toLocaleString()} tokens
            </div>
          )}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy"
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-green-400" />
              : <Copy className="h-3.5 w-3.5" />}
          </button>
          <pre className="max-h-52 overflow-auto p-4 pr-10 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
            {code}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14] shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{section.category}</p>
            <h2 className="mt-0.5 text-xl font-semibold">{section.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 overflow-auto">
          {isButton ? (
            <>
              {/* Left — preview image */}
              <div className="flex w-[55%] shrink-0 items-center justify-center rounded-bl-2xl bg-white/5 p-8">
                {section.previewImage ? (
                  <img
                    src={section.previewImage}
                    alt={section.name}
                    className="max-h-[55vh] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No preview available</div>
                )}
              </div>

              {/* Right — button options form */}
              <div className="flex w-[45%] shrink-0 flex-col overflow-y-auto border-l border-white/10">
                <div className="space-y-5 px-6 py-6">

                  {/* {colorTokens.length > 0 && (
                    <Field label="Color Palette">
                      <select
                        value={colorId}
                        onChange={(e) => setColorId(Number(e.target.value))}
                        className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                      >
                        {colorTokens.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                  )} */}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Size">
                      <select
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                      >
                        <option value="small">Small — 92×32</option>
                        <option value="medium">Medium — 100×40</option>
                        <option value="large">Large — 108×48</option>
                      </select>
                    </Field>

                    <Field label="Type">
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as ButtonType)}
                        className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="tertiary">Tertiary</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Mode">
                    <div className="flex gap-2">
                      {(["Light", "Dark"] as ButtonTheme[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`h-9 flex-1 rounded-lg border text-sm font-medium transition ${
                            theme === t
                              ? "border-2 border-primary text-primary bg-background"
                              : "border-white/10 bg-background hover:border-white/20"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Label toggle + input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Label</label>
                      <button
                        type="button"
                        onClick={toggleLabel}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${labelOn ? "bg-primary" : "bg-white/20"}`}
                      >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${labelOn ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    {labelOn && (
                      <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Button label…"
                        className="h-9 text-sm"
                      />
                    )}
                  </div>

                  {/* Icon toggle + position + search */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Icon</label>
                      <button
                        type="button"
                        onClick={toggleIcon}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${iconOn ? "bg-primary" : "bg-white/20"}`}
                      >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${iconOn ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    {iconOn && (
                      <div className="space-y-2">
                        <select
                          value={iconPos}
                          onChange={(e) => setIconPos(e.target.value as IconPosition)}
                          className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                        >
                          <option value="left">Icon — left of text</option>
                          <option value="right">Icon — right of text</option>
                        </select>
                        <IconSearch value={iconName} onChange={setIconName} />
                      </div>
                    )}
                  </div>
                </div>

                {outputArea}
              </div>
            </>
          ) : hasConfigPanel ? (
            /* Non-button with detected input fields — side-by-side like PreviewModal */
            <>
              {/* Left — preview image */}
              <div
                className="flex w-[55%] shrink-0 items-center justify-center bg-white/5 p-8"
              >
                {section.previewImage ? (
                  <img
                    src={section.previewImage}
                    alt={section.name}
                    className="max-h-[55vh] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No preview available</div>
                )}
              </div>

              {/* Right — InputConfigPanel + generate */}
              <div className="flex w-[45%] shrink-0 flex-col overflow-y-auto border-l border-white/10">
                {!isChatbox && !isModeOnlyComponent && !isUploads && !isAlertToast && !isForm && (
                  <div className="shrink-0 border-b border-white/10 px-6 py-4">
                    <h3 className="font-semibold">Input Configuration</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Fill in the values the AI will use when generating this component.
                    </p>
                  </div>
                )}
                {isForm && (
                  <div className="shrink-0 border-b border-white/10 px-6 py-4">
                    <h3 className="font-semibold">Form Configuration</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Define your form fields and their types.
                    </p>
                  </div>
                )}
                <div
                  className={
                    isTable
                      ? "flex-1 overflow-y-visible px-6 py-4"
                      : "min-h-0 flex-1 overflow-y-auto px-6 py-4"
                  }
                >
                  {!isTabs && !isChatbox && !isModeOnlyComponent && !isUploads && !isAlertToast && !isTopNavigation && !isSideNavigation && !isForm && (
                    <div className="mb-5">
                      <Field label="Size">
                        <select
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </Field>
                    </div>
                  )}

                  {isAlertToast ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as ButtonTheme[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setAlertToastMode(mode)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                alertToastMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Size">
                        <div className="flex gap-2">
                          {(["Small", "Big"] as AlertToastSize[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setAlertToastSize(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                alertToastSize === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Button</label>
                          <button
                            type="button"
                            onClick={() => setAlertToastHasButton((prev) => !prev)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${alertToastHasButton ? "bg-primary" : "bg-white/20"}`}
                          >
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${alertToastHasButton ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      </div>

                      <Field label="Status">
                        <select
                          value={alertToastStatus}
                          onChange={(e) => setAlertToastStatus(e.target.value as AlertToastStatus)}
                          className="h-9 w-full rounded-full border border-white/20 bg-background px-3 text-sm"
                        >
                          <option value="">Choose Status</option>
                          <option value="Success">Success</option>
                          <option value="Warning">Warning</option>
                          <option value="Error">Error</option>
                          <option value="Hint">Hint</option>
                        </select>
                      </Field>

                      <Field label="Message">
                        <Input
                          value={alertToastMessage}
                          onChange={(e) => setAlertToastMessage(e.target.value)}
                          placeholder="Enter message"
                          className="h-9 text-sm"
                        />
                      </Field>
                    </div>
                  ) : isUploads ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as ButtonTheme[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setUploadMode(mode)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                uploadMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Style">
                        <div className="flex gap-2">
                          {(["Style 1", "Style 2"] as UploadStyle[]).map((styleOption) => (
                            <button
                              key={styleOption}
                              type="button"
                              onClick={() => setUploadStyle(styleOption)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                uploadStyle === styleOption
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {styleOption}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Supported Documents">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={uploadDocToAdd}
                              onChange={(e) => setUploadDocToAdd(e.target.value)}
                              className="h-9 flex-1 rounded-lg border border-white/10 bg-background px-3 text-sm"
                            >
                              {uploadDocumentOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleAddUploadDocument}
                              className="h-9 rounded-lg border border-white/20 px-4 text-sm font-medium transition hover:bg-white/10"
                            >
                              Add
                            </button>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                            <p className="mb-2 text-xs text-muted-foreground">Selected files</p>
                            {uploadSupportedDocs.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {uploadSupportedDocs.map((doc) => {
                                  const label = uploadDocumentOptions.find((option) => option.value === doc)?.label ?? doc;
                                  return (
                                    <span
                                      key={doc}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs"
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUploadDocument(doc)}
                                        className="rounded-full p-0.5 text-muted-foreground transition hover:bg-white/20 hover:text-foreground"
                                        title="Remove"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No file types selected.</p>
                            )}
                          </div>
                        </div>
                      </Field>

                      <Field label="Max Size (MB)">
                        <Input
                          type="number"
                          min={10}
                          step={10}
                          value={uploadMaxSizeMb}
                          onChange={(e) => setUploadMaxSizeMb(normalizeUploadMaxSize(Number(e.target.value)))}
                          className="h-9 text-sm"
                        />
                      </Field>
                    </div>
                  ) : isChatbox ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as ChatboxMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setChatboxMode(mode)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                chatboxMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Size">
                        <div className="flex gap-2">
                          {(["Small", "Big"] as ChatboxSize[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setChatboxSize(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                chatboxSize === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Style">
                        <div className="flex gap-2">
                          {(["Neumorphic", "Neumorphic - Gradient"] as ChatboxStyle[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setChatboxStyle(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                chatboxStyle === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  ) : isTabs ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as TabsTheme[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setTabsMode(mode)}
                              className={`h-9 flex-1 rounded-lg border text-sm font-medium transition ${
                                tabsMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/10 bg-background hover:border-white/20"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="No. of tabs">
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={tabsCountInput}
                          onChange={(e) => {
                            setTabsCountInput(e.target.value);
                            setTabsReady(false);
                          }}
                          placeholder="Enter number of tabs"
                          className="h-9 text-sm"
                        />
                      </Field>

                      <button
                        type="button"
                        onClick={handleTabsNext}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-medium transition hover:bg-white/10"
                      >
                        Next
                      </button>

                      {tabsReady && tabsCount > 0 && (
                        <div className="space-y-3">
                          {Array.from({ length: tabsCount }, (_, index) => (
                            <Field key={index} label={`Tab ${index + 1} Content`}>
                              <Input
                                value={tabsContent[index] ?? ""}
                                onChange={(e) => handleTabContentChange(index, e.target.value)}
                                placeholder={`Enter content for Tab ${index + 1}`}
                                className="h-9 text-sm"
                              />
                            </Field>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : isModeOnlyComponent ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as ButtonTheme[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setSimpleMode(mode)}
                              className={`h-9 flex-1 rounded-lg border text-sm font-medium transition ${
                                simpleMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/10 bg-background hover:border-white/20"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  ) : isTopNavigation ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as TopNavMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setTopNavMode(mode)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                topNavMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile</label>
                            <button
                              type="button"
                              onClick={() => setTopNavProfile((prev) => !prev)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${topNavProfile ? "bg-primary" : "bg-white/20"}`}
                            >
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${topNavProfile ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>
                          {/* <p className="text-[11px] text-muted-foreground">Default: Off</p> */}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notification</label>
                            <button
                              type="button"
                              onClick={() => setTopNavNotification((prev) => !prev)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${topNavNotification ? "bg-primary" : "bg-white/20"}`}
                            >
                              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${topNavNotification ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>
                          {/* <p className="text-[11px] text-muted-foreground">Default: Off</p> */}
                        </div>
                      </div>

                      <Field label="Nav Buttons">
                        <select
                          value={topNavAlignment}
                          onChange={(e) => setTopNavAlignment(e.target.value as TopNavAlignment)}
                          className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                        >
                          <option value="None">None</option>
                          <option value="Center">Center</option>
                          <option value="Right">Right</option>
                          <option value="Off">Off</option>
                        </select>
                      </Field>

                      <Field label="Grid">
                        <select
                          value={topNavGrid}
                          onChange={(e) => setTopNavGrid(e.target.value as TopNavGrid)}
                          className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                        >
                          <option value="None">None</option>
                          <option value="Desktop compact">Desktop compact</option>
                          <option value="Desktop medium">Desktop medium</option>
                          <option value="Desktop spacious">Desktop spacious</option>
                          <option value="Mobile medium">Mobile medium</option>
                        </select>
                      </Field>
                    </div>
                  ) : isSideNavigation ? (
                    <div className="space-y-5">
                      <Field label="Mode">
                        <div className="flex gap-2">
                          {(["Light", "Dark"] as SideNavMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setSideNavMode(mode)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                sideNavMode === mode
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Style">
                        <div className="flex gap-2">
                          {(["Neumorphic", "Flat"] as SideNavStyle[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSideNavStyle(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                sideNavStyle === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Grid Spacing">
                        <div className="flex gap-2">
                          {(["Compact", "Medium"] as SideNavGridSpacing[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSideNavGridSpacing(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                sideNavGridSpacing === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Type">
                        <div className="flex gap-2">
                          {(["Fixed", "Floating"] as SideNavType[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSideNavType(option)}
                              className={`h-9 flex-1 rounded-full border text-sm font-medium transition ${
                                sideNavType === option
                                  ? "border-2 border-primary text-primary bg-background"
                                  : "border-white/20 bg-background hover:border-white/30"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  ) : isForm ? (
                    <FormConfigPanel
                      onChange={handleFormConfigChange}
                      labels={section.fieldLabels as any}
                    />
                  ) : (
                    <InputConfigPanel
                      textOnly={section.textOnly}
                      iconOnly={section.iconOnly}
                      iconText={section.iconText}
                      onChange={handleConfigChange}
                      labels={section.fieldLabels}
                      componentCategory={section.category}
                    />
                  )}
                </div>
                {outputArea}
              </div>
            </>
          ) : (
            /* Non-button, no input fields — full-width preview + generate below */
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 items-center justify-center p-8">
                {section.previewImage ? (
                  <img
                    src={section.previewImage}
                    alt={section.name}
                    className="max-h-[50vh] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Preview unavailable</div>
                )}
              </div>
              {!isButton && (
                <div className="px-6 pb-4">
                  <Field label="Size">
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="h-9 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </Field>
                </div>
              )}
              {outputArea}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRef, useState } from "react";
import { X, Upload, Plus, Loader2, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/services/api-client";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  typeOptions?: string[];
  categoriesEndpoint?: string;
  submitEndpoint: string;
  onSuccess: () => void;
  showBrandEntries?: boolean;
  brandsEndpoint?: string;
  requireCategory?: boolean;
  requireFigmaUrl?: boolean;
  showSecondFigmaUrl?: boolean;
  designSystem?: string;
}

interface BrandEntry {
  id: string;
  brandName: string;
  figmaFrameUrl: string;
}

interface FormState {
  name: string;
  type: string;
  previewImageUrl: string;
  description: string;
  figmaFrameUrl: string;
  figmaFileUrl2: string;
  textOnly: number;
  iconOnly: number;
  imageField: number;
  textIcon: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "",
  previewImageUrl: "",
  description: "",
  figmaFrameUrl: "",
  figmaFileUrl2: "",
  textOnly: 0,
  iconOnly: 0,
  imageField: 0,
  textIcon: 0,
};

function newEntry(): BrandEntry {
  return { id: Math.random().toString(36).slice(2), brandName: "", figmaFrameUrl: "" };
}

export function AddItemModal({
  isOpen,
  onClose,
  title,
  typeOptions = [],
  categoriesEndpoint,
  submitEndpoint,
  onSuccess,
  showBrandEntries = false,
  brandsEndpoint = "/brands",
  requireCategory = true,
  requireFigmaUrl = false,
  showSecondFigmaUrl = false,
  designSystem = "Chatbot Design System",
}: AddItemModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedDesignSystem, setSelectedDesignSystem] = useState("");
  const [brandEntries, setBrandEntries] = useState<BrandEntry[]>([newEntry()]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFieldCounts, setShowFieldCounts] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const designSystemOptions = ["Chatbot Design System", "Halo", "Proton", "Other"];

  const { data: dbCategories = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["categories", categoriesEndpoint],
    queryFn: () => apiFetch<{ id: number; name: string }[]>(categoriesEndpoint!),
    enabled: !!categoriesEndpoint,
    staleTime: 60_000,
  });

  const { data: brands = [] } = useQuery<{ id: number; brand_name: string }[]>({
    queryKey: ["brands", brandsEndpoint],
    queryFn: () => apiFetch<{ id: number; brand_name: string }[]>(brandsEndpoint),
    enabled: showBrandEntries,
    staleTime: 60_000,
  });

  const categoryOptions: string[] =
    categoriesEndpoint && dbCategories.length > 0
      ? dbCategories.map((c) => c.name)
      : typeOptions;

  function reset() {
    setForm(EMPTY_FORM);
    setSelectedDesignSystem("");
    setBrandEntries([newEntry()]);
    setImagePreview("");
    setError(null);
    setIsSubmitting(false);
    setIsUploading(false);
    setShowFieldCounts(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Only PNG and JPG/JPEG files are allowed.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await apiFetch<{ url: string }>("/upload", { method: "POST", body: fd });
      setForm((prev) => ({ ...prev, previewImageUrl: result.url }));
      setImagePreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function updateEntry(id: string, field: keyof Omit<BrandEntry, "id">, value: string) {
    setBrandEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  function removeEntry(id: string) {
    setBrandEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const validEntries = brandEntries.filter(
    (e) => e.brandName.trim() !== "" && e.figmaFrameUrl.trim() !== ""
  );

  const baseValid =
    form.name.trim() !== "" &&
    (!requireCategory || form.type !== "") &&
    (!requireFigmaUrl || form.figmaFrameUrl.trim() !== "") &&
    form.previewImageUrl !== "" &&
    !isUploading;

  const formValid = showBrandEntries
    ? baseValid && validEntries.length > 0
    : baseValid;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      if (showBrandEntries) {
        for (const entry of validEntries) {
          await apiFetch(submitEndpoint, {
            method: "POST",
            body: JSON.stringify({
              template_name: form.name,
              template_category: form.type,
              brand_name: entry.brandName.trim(),
              figma_frame_url: entry.figmaFrameUrl.trim(),
              preview_image_url: form.previewImageUrl,
              description: form.description.trim() || null,
              // Manual overrides — 0 means "auto-detect from Figma"
              text_only: form.textOnly || null,
              icon_only: form.iconOnly || null,
              image_field: form.imageField || null,
              text_icon: form.textIcon || null,
            }),
          });
        }
      } else {
        await apiFetch(submitEndpoint, {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            type: form.type,
            type_: form.type,
            category: form.type,
            design_system: selectedDesignSystem || designSystem,
            preview_image_url: form.previewImageUrl,
            figma_frame_url: form.figmaFrameUrl.trim() || null,
            figma_file_url_2: form.figmaFileUrl2.trim() || null,
            description: form.description.trim() || null,
            text_only: form.textOnly || 0,
            icon_only: form.iconOnly || 0,
            image_field: form.imageField || 0,
            icon_text: form.textIcon || 0,
          }),
        });
      }
      reset();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">Fill in the details below</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Modern Hero Section"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Category */}
          {requireCategory && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Select a type</option>
                {categoryOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Design System — only for non-brand-entry mode (components / library) */}
          {!showBrandEntries && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Design System
              </label>
              <select
                value={selectedDesignSystem}
                onChange={(e) => setSelectedDesignSystem(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="">Select a Design System</option>
                {designSystemOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview image — shared across all brand entries */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Preview Image <span className="text-red-500">*</span>{" "}
              <span className="font-normal text-muted-foreground">(.png, .jpg, .jpeg)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 py-6 transition hover:border-primary/50 hover:bg-secondary/60"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg object-contain"
                />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">Click to upload</span>
                </>
              )}
            </div>
            {imagePreview && !isUploading && (
              <p className="text-xs text-muted-foreground">
                Image uploaded. Click again to replace.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Short description of this section"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Figma URL — only for non-brand-entry mode (library / emailer / components) */}
          {!showBrandEntries && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Figma Frame URL {requireFigmaUrl ? <span className="text-red-500">*</span> : null}
              </label>
              <Input
                placeholder="https://www.figma.com/design/…?node-id=…"
                value={form.figmaFrameUrl}
                onChange={(e) => setForm((p) => ({ ...p, figmaFrameUrl: e.target.value }))}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Right-click the component set in Figma → Copy link. Input fields will be auto-detected.
              </p>
            </div>
          )}

          {/* Second Figma URL for rules/reference — only when showSecondFigmaUrl is true */}
          {!showBrandEntries && showSecondFigmaUrl && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Rules/Reference Figma URL <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                placeholder="https://www.figma.com/design/…?node-id=… (design rules or reference)"
                value={form.figmaFileUrl2}
                onChange={(e) => setForm((p) => ({ ...p, figmaFileUrl2: e.target.value }))}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Figma document containing design rules, tokens, or reference frames for the AI.
              </p>
            </div>
          )}

          {/* Input field counts — manual override for all modes */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowFieldCounts((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <span className={`inline-block transition-transform ${showFieldCounts ? "rotate-90" : ""}`}>▶</span>
              {showBrandEntries
                ? "Input field counts (optional — auto-detected from Figma)"
                : "Input field counts (optional — overrides auto-detection)"}
            </button>
            {showFieldCounts && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-4">
                {(
                  [
                    { label: "Text fields", key: "textOnly" as const },
                    { label: "Icon-only slots", key: "iconOnly" as const },
                    { label: "Image areas", key: "imageField" as const },
                    { label: "Icon + text slots", key: "textIcon" as const },
                  ] as const
                ).map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={form[key] || ""}
                      placeholder="0"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [key]: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brand entries */}
          {showBrandEntries && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Brands <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBrandEntries((prev) => [...prev, newEntry()])}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add brand
                </button>
              </div>

              <div className="space-y-2">
                {brandEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    {/* Brand dropdown */}
                    <select
                      value={entry.brandName}
                      onChange={(e) => updateEntry(entry.id, "brandName", e.target.value)}
                      className="h-10 w-40 shrink-0 rounded-xl border bg-background px-3 text-sm"
                    >
                      <option value="">Brand…</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.brand_name}>
                          {b.brand_name}
                        </option>
                      ))}
                    </select>

                    {/* Figma URL */}
                    <Input
                      placeholder="https://www.figma.com/file/…"
                      value={entry.figmaFrameUrl}
                      onChange={(e) => updateEntry(entry.id, "figmaFrameUrl", e.target.value)}
                      className="font-mono text-xs flex-1"
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={brandEntries.length === 1}
                      className="mt-1 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Right-click a frame in Figma → Copy link. Each brand gets its own frame.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t px-6 py-4">
          <Button disabled={!formValid || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:border-primary/40 hover:shadow-glow w-full text-left"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary/30 flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 transition group-hover:border-primary/60 group-hover:bg-primary/5">
          <Plus className="h-6 w-6 text-muted-foreground transition group-hover:text-primary" />
        </div>
      </div>
      <div className="p-5">
        <p className="text-base text-center font-medium text-muted-foreground group-hover:text-foreground transition">
          Add New Item
        </p>
      </div>
    </button>
  );
}

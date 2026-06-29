import type { SectionCategory, SectionItem } from "@/types/section";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type TemplateRecord = {
  id: number;
  template_name: string;
  template_category: string;
  brand_name: string;
  figma_frame_url: string;
  preview_image?: string | null;
  description?: string | null;
  text_only?: number;
  icon_only?: number;
  icon_text?: number;
  image_field?: number;
  field_labels?: {
    text_fields?: string[];
    icon_slots?: string[];
    image_fields?: string[];
    icon_text_slots?: string[];
  };
  // backward-compat aliases returned by the API
  name?: string;
  category?: string;
};

export async function fetchTemplateSections(endpoint = "/templates"): Promise<SectionItem[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${endpoint}`, {
      cache: "no-store",
    });
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  const templates = (await response.json()) as TemplateRecord[];
  return templates.map(templateToSection);
}

export async function fetchTemplateSection(id: string): Promise<SectionItem | null> {
  return fetchTemplateSectionByEndpoint(id, "/templates");
}

export async function fetchTemplateSectionByEndpoint(
  id: string,
  endpoint = "/templates"
): Promise<SectionItem | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${endpoint}/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return templateToSection((await response.json()) as TemplateRecord);
}

function templateToSection(template: TemplateRecord): SectionItem {
  const name = template.template_name || template.name || "";
  const category = template.template_category || template.category || "";

  return {
    id: String(template.id),
    name,
    category: category as SectionCategory,
    description: template.description || "",
    tags: [category].filter(Boolean),
    previewImage: template.preview_image || "",
    promptTemplate: template.description || "",
    figmaFrameUrl: template.figma_frame_url || "",
    brandName: template.brand_name || "",
    createdAt: "",
    textOnly: template.text_only ?? 0,
    iconOnly: template.icon_only ?? 0,
    iconText: template.icon_text ?? 0,
    imageField: template.image_field ?? 0,
    fieldLabels: template.field_labels ?? {},
  };
}

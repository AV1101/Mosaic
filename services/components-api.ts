import { apiFetch } from "@/services/api-client";

export interface ComponentItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  status: string;
  category: string;
  design_system: string;
  tags: string[];
  preview_image_url: string | null;
  figma_frame_url: string | null;
  field_labels: {
    text_fields?: string[];
    icon_slots?: string[];
    image_fields?: string[];
    icon_text_slots?: string[];
  } | null;
  text_only: number;
  icon_only: number;
  icon_text: number;
  image_field: number;
}

export const componentsApi = {
  list: (q?: string) =>
    apiFetch<ComponentItem[]>(`/components${q ? `?q=${encodeURIComponent(q)}` : ""}`),
};

export function componentToSection(item: ComponentItem) {
  return {
    id: String(item.id),
    name: item.name,
    category: item.category,
    designSystem: item.design_system ?? "Chatbot Design System",
    description: item.description ?? "",
    tags: item.tags ?? [],
    previewImage: item.preview_image_url ?? "",
    promptTemplate: "",
    figmaFrameUrl: item.figma_frame_url ?? "",
    brandName: "",
    createdAt: "",
    textOnly: item.text_only ?? 0,
    iconOnly: item.icon_only ?? 0,
    iconText: item.icon_text ?? 0,
    imageField: item.image_field ?? 0,
    fieldLabels: item.field_labels ?? {},
  };
}

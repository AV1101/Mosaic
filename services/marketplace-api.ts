import { apiFetch } from "@/services/api-client";

export type ApiComponent = {
  id: number;
  slug: string;
  name: string;
  description: string;
  status: string;
  category: string;
  tags: string[];
  preview_image_url?: string | null;
};

export const marketplaceApi = {
  components: (query = "") => apiFetch<ApiComponent[]>(`/components?q=${encodeURIComponent(query)}`),
  semanticSearch: (query: string) => apiFetch<{ query: string; mode: string; results: ApiComponent[] }>(`/search/semantic?q=${encodeURIComponent(query)}`),
  createGeneration: (payload: { prompt: string; tokens?: Record<string, unknown> }) =>
    apiFetch<{ id: number; output_code: string; tokens_used: number }>("/generations", {
      method: "POST",
      body: JSON.stringify({ ...payload, tokens: payload.tokens ?? {} })
    })
};

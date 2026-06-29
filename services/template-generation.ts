import { apiFetch } from "./api-client";

export type TemplatePayload = {
  template_name: string;
  selected_template_name?: string;
  template_id?: number;
  framework?: string;
  brand_name?: string;
  industry: string;
  theme: string;
  tokens: Record<string, any>;
  structure: Record<string, any>;
};

export type TemplateGenerationRequest = {
  provider?: string;
  model?: string;
  payload: TemplatePayload;
};

export type TemplateGenerationResponse = {
  compiled_prompt: string;
};

export async function generateTemplatePrompt(
  body: TemplateGenerationRequest
): Promise<TemplateGenerationResponse> {
  return apiFetch<TemplateGenerationResponse>("/template-generation", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

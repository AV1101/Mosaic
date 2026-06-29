/**
 * Get the selected AI model from localStorage
 * Defaults to GPT-4o if not set
 */
export function getSelectedModel(): string {
  if (typeof window === "undefined") {
    return "GPT-4o";
  }
  return localStorage.getItem("ai_model") || "GPT-4o";
}

/**
 * Format model name for display
 */
export function formatModelForDisplay(model: string): string {
  if (model === "GPT-5.4" || model === "gpt-5.4") {
    return "GPT-5.4";
  }
  return "GPT-4o";
}

/**
 * Get the Azure deployment name for a given model
 */
export function getAzureDeployment(model: string): string {
  if (model === "GPT-5.4" || model === "gpt-5.4") {
    return "gpt-5-4";
  }
  return "gpt-4o"; // Default to GPT-4o
}

/**
 * Map internal model names to display names
 */
export const MODEL_OPTIONS = [
  { value: "GPT-4o", label: "GPT-4o" },
  { value: "GPT-5.4", label: "GPT-5.4" },
];

"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clipboard, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/features/auth/require-auth";
import { apiFetch } from "@/services/api-client";

const DEFAULT_REFERENCE_CODE = `type SectionProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  items?: Array<{ title: string; description: string; metric?: string }>;
};

export function Section({ title, subtitle, primaryCta, secondaryCta, items = [] }: SectionProps) {
  return (
    <section className="w-full bg-background px-6 py-16 text-foreground md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-lg text-muted-foreground">{subtitle}</p> : null}
          <div className="flex flex-wrap gap-3">
            {primaryCta ? <a className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href={primaryCta.href}>{primaryCta.label}</a> : null}
            {secondaryCta ? <a className="rounded-md border px-4 py-2" href={secondaryCta.href}>{secondaryCta.label}</a> : null}
          </div>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.title} className="rounded-lg border bg-card p-4">
              {item.metric ? <div className="text-2xl font-semibold">{item.metric}</div> : null}
              <h2 className="mt-2 font-medium">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}`;

function buildPrompt({
  name,
  componentType,
  productBrief,
  audience,
  visualDirection,
  interactionRequirements,
  dataRequirements,
  codeRequirements,
  acceptanceCriteria,
  referenceCode
}: {
  name: string;
  componentType: string;
  productBrief: string;
  audience: string;
  visualDirection: string;
  interactionRequirements: string;
  dataRequirements: string;
  codeRequirements: string;
  acceptanceCriteria: string;
  referenceCode: string;
}) {
  return `You are building production-ready frontend code for: ${name}.

Goal:
Create a complete ${componentType} that can be pasted into an AI coding extension and implemented without additional clarification. The result must be polished, responsive, accessible, and ready to integrate into an existing React + TypeScript + Tailwind application.

Product context:
${productBrief}

Target audience:
${audience}

Visual direction:
${visualDirection}

Interaction requirements:
${interactionRequirements}

Data and content requirements:
${dataRequirements}

Code requirements:
${codeRequirements}

Accessibility and UX requirements:
- Use semantic HTML landmarks and heading order.
- Ensure keyboard navigation works for every interactive element.
- Use visible focus states and descriptive labels.
- Preserve contrast for text, buttons, borders, and disabled states.
- Avoid layout shift when data changes.
- Handle empty, loading, and error states where relevant.
- Keep mobile, tablet, and desktop layouts deliberate instead of merely stacked.

Implementation constraints:
- Use React, TypeScript, and Tailwind CSS.
- Do not introduce a new design system unless explicitly required.
- Prefer existing app primitives if available: Button, Input, Textarea, Card, Badge, Dialog, Select, Tabs, Tooltip.
- Use lucide-react icons when icons are useful.
- Keep components small enough to maintain, but do not split files unless the project structure requires it.
- Include realistic sample data directly in the component when backend data is not provided.
- Do not leave TODO comments or placeholder lorem ipsum.

Acceptance criteria:
${acceptanceCriteria}

Reference implementation shape:
\`\`\`tsx
${referenceCode}
\`\`\`

Return format:
1. Briefly list the files you would create or edit.
2. Provide the complete code for each file in fenced code blocks.
3. Include any assumptions in a short final note.
4. Do not omit imports, props, mock data, or helper functions.`;
}

export default function PromptEditorPage() {
  const [name, setName] = useState("Enterprise Marketplace Section Prompt");
  const [componentType, setComponentType] = useState("marketplace-ready landing page section");
  const [productBrief, setProductBrief] = useState("A section marketplace where teams browse, generate, and reuse high-quality web sections for enterprise products.");
  const [audience, setAudience] = useState("Designers, developers, and admins working inside a fast-moving product team.");
  const [visualDirection, setVisualDirection] = useState("Quiet enterprise UI, dense but readable layout, restrained color, strong spacing, no decorative gradients, and components that feel useful on the first screen.");
  const [interactionRequirements, setInteractionRequirements] = useState("Include clear primary actions, hover states, keyboard focus states, responsive behavior, and copy-ready output where relevant.");
  const [dataRequirements, setDataRequirements] = useState("Use realistic sample content with names, statuses, timestamps, categories, and metrics. Keep the content specific to the product context.");
  const [codeRequirements, setCodeRequirements] = useState("Build a self-contained React component with typed props, local sample data, Tailwind classes, and lucide-react icons where helpful.");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("The section must compile, fit in mobile and desktop viewports, avoid overlapping text, include no dead controls, and look ready for a production SaaS interface.");
  const [referenceCode, setReferenceCode] = useState(DEFAULT_REFERENCE_CODE);

  const body = useMemo(
    () =>
      buildPrompt({
        name,
        componentType,
        productBrief,
        audience,
        visualDirection,
        interactionRequirements,
        dataRequirements,
        codeRequirements,
        acceptanceCriteria,
        referenceCode
      }),
    [acceptanceCriteria, audience, codeRequirements, componentType, dataRequirements, interactionRequirements, name, productBrief, referenceCode, visualDirection]
  );

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/prompts", {
        method: "POST",
        body: JSON.stringify({
          name,
          body,
          developer_prompt: codeRequirements,
          user_prompt_template: body,
          example_input: productBrief,
          reference_code: referenceCode,
          token_placeholders: ["{{brand}}", "{{audience}}", "{{component_type}}", "{{data_source}}"],
          design_constraints: { visualDirection, interactionRequirements },
          accessibility_requirements: { keyboard: true, semanticHtml: true, contrast: true, responsive: true },
          framework_targets: ["React", "TypeScript", "Tailwind CSS", "lucide-react"],
          status: "ready",
          ai_metadata: { source: "website", appendOnly: true, copyPasteReady: true }
        })
      }),
    onSuccess: () => toast.success("Prompt appended to the table"),
    onError: (error) => toast.error(error.message)
  });

  async function copyPrompt() {
    await navigator.clipboard.writeText(body);
    toast.success("Prompt copied");
  }

  return (
    <AppShell>
      <RequireAuth roles={["admin", "designer"]}>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Prompt Builder</h1>
              <p className="mt-2 text-muted-foreground">Append detailed, code-ready prompts to the website prompt table.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyPrompt}>
                <Clipboard className="h-4 w-4" /> Copy
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim() || !body.trim()}>
                <Save className="h-4 w-4" /> {save.isPending ? "Saving..." : "Append"}
              </Button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Prompt name" />
              <Input value={componentType} onChange={(event) => setComponentType(event.target.value)} placeholder="Component type" />
              <Textarea value={productBrief} onChange={(event) => setProductBrief(event.target.value)} placeholder="Product brief" />
              <Textarea value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Audience" />
              <Textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} placeholder="Visual direction" />
              <Textarea value={interactionRequirements} onChange={(event) => setInteractionRequirements(event.target.value)} placeholder="Interaction requirements" />
              <Textarea value={dataRequirements} onChange={(event) => setDataRequirements(event.target.value)} placeholder="Data requirements" />
              <Textarea value={codeRequirements} onChange={(event) => setCodeRequirements(event.target.value)} placeholder="Code requirements" />
              <Textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} placeholder="Acceptance criteria" />
            </section>

            <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
              <div>
                <h2 className="font-semibold">Reference Code</h2>
                <Textarea value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} className="mt-3 min-h-72 font-mono text-xs" />
              </div>
              <div>
                <h2 className="font-semibold">Generated Prompt</h2>
                <Textarea readOnly value={body} className="mt-3 min-h-[34rem] font-mono text-xs" />
              </div>
            </section>
          </div>
        </div>
      </RequireAuth>
    </AppShell>
  );
}

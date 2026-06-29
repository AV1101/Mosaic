import { AppShell } from "@/components/app-shell";
import { GenerationPanel } from "@/components/generation-panel";
import { fetchTemplateSection } from "@/services/template-data";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section: sectionId } = await searchParams;
  const section = sectionId ? await fetchTemplateSection(sectionId) : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Generate with AI</h1>
          <p className="mt-2 text-muted-foreground">Select a template and adjust the visual tokens below. The prompt is generated automatically.</p>
        </div>
        <GenerationPanel
          initialPrompt={section?.promptTemplate}
          templateName={section?.name}
        />
      </div>
    </AppShell>
  );
}

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PreviewModal } from "@/components/preview-modal";
import { fetchTemplateSection } from "@/services/template-data";

export default async function SectionPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = await fetchTemplateSection(id);

  if (!section) {
    notFound();
  }

  return (
    <AppShell>
      <PreviewModal section={section} />
    </AppShell>
  );
}

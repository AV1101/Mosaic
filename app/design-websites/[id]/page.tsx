import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DesignWebsitePreviewModal } from "@/components/design-website-preview-modal";
import { fetchTemplateSectionByEndpoint } from "@/services/template-data";

export default async function DesignWebsitePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const section = await fetchTemplateSectionByEndpoint(id, "/design-templates");

  if (!section) {
    notFound();
  }

  return (
    <AppShell>
      <DesignWebsitePreviewModal
        section={section}
        backHref="/design-websites"
        templateSource="design-websites"
        brandsEndpoint="/design-brands"
      />
    </AppShell>
  );
}

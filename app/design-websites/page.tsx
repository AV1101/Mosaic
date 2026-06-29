import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/app/marketplace/marketplace-client";
import { fetchTemplateSections } from "@/services/template-data";

export default async function DesignWebsitesPage() {
  const sections = await fetchTemplateSections("/design-templates");

  return (
    <AppShell>
      <MarketplaceClient
        sections={sections}
        title="Brand Websites v2"
        subtitle="Brand website templates where layout comes from Figma and visual identity comes from design brand tokens."
        detailBasePath="/design-websites"
        categoriesEndpoint={undefined}
        submitEndpoint="/design-templates/add"
        brandsEndpoint="/design-brands"
        showBrandEntries={false}
        requireCategory={false}
        requireFigmaUrl={true}
      />
    </AppShell>
  );
}

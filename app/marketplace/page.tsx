import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/app/marketplace/marketplace-client";
import { fetchTemplateSections } from "@/services/template-data";

export default async function MarketplacePage() {
  const sections = await fetchTemplateSections();

  return (
    <AppShell>
      <MarketplaceClient sections={sections} />
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { LibraryClient } from "@/app/library/lib-client";
import { componentToSection } from "@/services/components-api";
import type { ComponentItem } from "@/services/components-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function LibraryPage() {
  let sections: ReturnType<typeof componentToSection>[] = [];

  try {
    const res = await fetch(`${API_URL}/api/components`, { cache: "no-store" });
    if (res.ok) {
      const items = (await res.json()) as ComponentItem[];
      sections = items.map(componentToSection);
    }
  } catch {
    // backend may be starting — render empty grid gracefully
  }

  return (
    <AppShell>
      <LibraryClient sections={sections} />
    </AppShell>
  );
}

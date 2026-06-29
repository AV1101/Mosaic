import { AppShell } from "@/components/app-shell";
import { PromptsClient } from "@/app/prompts/prompts-client";
import { RequireAuth } from "@/features/auth/require-auth";

export default function PromptsPage() {
  return (
    <AppShell>
      <RequireAuth>
        <PromptsClient />
      </RequireAuth>
    </AppShell>
  );
}

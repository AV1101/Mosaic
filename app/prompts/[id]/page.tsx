import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Prompt Detail #{id}</h1>
          <p className="mt-2 text-muted-foreground">Version history, duplication, embeddings, and comparison UI endpoint.</p>
        </div>
        <Card className="p-5">
          <h2 className="font-semibold">Version History</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl bg-secondary p-4">v3 - Token placeholders refined</div>
            <div className="rounded-2xl bg-secondary p-4">v2 - Added AI metadata</div>
            <div className="rounded-2xl bg-secondary p-4">v1 - Initial prompt</div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

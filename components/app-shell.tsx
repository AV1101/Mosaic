import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="gradient-grid fixed inset-0 -z-10 opacity-40" />
      {/* Sidebar lives at the absolute left edge of the window */}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 px-6 py-6 lg:py-4">{children}</main>
      </div>
    </div>
  );
}

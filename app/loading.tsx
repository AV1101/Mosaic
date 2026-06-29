import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[calc(100vh-3rem)] lg:block" />
        <div className="space-y-5">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
    </main>
  );
}

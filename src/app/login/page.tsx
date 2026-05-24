import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginFormNoSsr } from "@/components/login-form-no-ssr";
import { getCurrentUser } from "@/lib/server/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)] px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex h-12 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
            <span className="relative flex size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#090a0f]">
              <Image src="/cloudsurf-mark.png" alt="" fill sizes="40px" className="object-cover" priority />
            </span>
            Cloudsurf Texture AI
          </Link>
          <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[#151823] hover:text-foreground">
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.95fr_0.8fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[var(--accent)]">Secure workspace</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-6xl">Welcome back to your texture workspace.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
              Sign in to continue generating atlases, PBR maps, and emissive textures for your scenery projects.
            </p>
            <div className="mt-10 grid gap-5 text-sm text-[var(--muted)] sm:grid-cols-2">
              <div className="min-h-40 rounded-lg border border-[var(--line)] bg-[#111520] p-5 sm:p-6">
                <p className="font-semibold text-foreground">Project history</p>
                <p className="mt-3 leading-6">Pick up exactly where your last workflow left off.</p>
              </div>
              <div className="min-h-40 rounded-lg border border-[var(--line)] bg-[#111520] p-5 sm:p-6">
                <p className="font-semibold text-foreground">Private assets</p>
                <p className="mt-3 leading-6">Generated textures stay scoped to your account.</p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:ml-auto">
            <LoginFormNoSsr next={params.next ?? "/dashboard"} />
          </div>
        </section>
      </div>
    </main>
  );
}

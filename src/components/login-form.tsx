"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const signInUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(next)}`;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
      <div className="border-b border-[var(--line)] bg-[#151923] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">Account access</p>
            <h2 className="mt-1 text-xl font-semibold">Sign in to continue</h2>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Access your Cloudsurf Texture AI workspace and continue your saved projects.
        </p>
        <a
          href={signInUrl}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-background"
        >
          Continue
          <ArrowRight className="size-4" />
        </a>
        <div className="mt-6 rounded-md border border-[var(--line)] bg-[#0d1018] p-4 sm:p-5">
          <p className="text-xs leading-5 text-[var(--muted)]">
            Secure sign-in keeps project data and generated texture assets scoped to your account.
          </p>
        </div>
      </div>
    </div>
  );
}

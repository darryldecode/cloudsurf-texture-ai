import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleDollarSign, Sparkles } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/credit-packs";
import { PageHero, PublicPageShell } from "../_components/public-chrome";

export const metadata: Metadata = {
  title: "Pricing | Cloudsurf Texture AI",
  description: "Credit pack pricing for Cloudsurf Texture AI texture atlas and PBR generation.",
};

const usageItems = [
  "Texture atlas generation: 1 credit for material and facade atlas outputs.",
  "PBR generation: 1 credit for normal, roughness, and metallic maps.",
  "Utility PBR generation: 1 credit per uploaded image.",
  "Utility emissive generation: 1 credit per uploaded image.",
];

const includedItems = [
  "Prepaid Cloudsurf Texture AI credits added to your account after Paddle confirms payment.",
  "Access to the web workspace for project setup, reference uploads, exclusions, generation history, and downloads.",
  "Texture atlas deliverables, including albedo-style facade/material atlases generated from your uploaded references.",
  "PBR deliverables for supported workflows, including normal, roughness, and metallic texture maps.",
  "Emissive deliverables for night-lighting workflows that preserve the source atlas layout where possible.",
];

export default function PricingPage() {
  return (
    <PublicPageShell>
      <PageHero
        eyebrow="Pricing"
        title="Credits for production texture generation."
        body="Buy prepaid credits for Cloudsurf Texture AI, a texture atlas and PBR generation service for scenery, game environment, and architectural visualization workflows."
      />

      <section className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-3">
          {CREDIT_PACKS.map((pack) => {
            const perCredit = pack.priceUsd / pack.credits;
            const featured = pack.id === "production";

            return (
              <article
                key={pack.id}
                className={`rounded-lg border p-6 ${
                  featured ? "border-[var(--accent)] bg-emerald-300/10" : "border-[var(--line)] bg-[var(--panel)]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{pack.label}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{pack.description}</p>
                  </div>
                  {featured ? <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-[#06120b]">Popular</span> : null}
                </div>
                <p className="mt-8 text-4xl font-semibold tracking-normal">${pack.priceUsd}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {pack.credits} credits, about ${perCredit.toFixed(2)} per credit
                </p>
                <Link
                  href="/dashboard/account"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)]"
                >
                  <CircleDollarSign className="size-4" />
                  Buy credits
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--line)] px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Included with purchase</p>
            <h2 className="mt-3 text-2xl font-semibold">Credits unlock the workspace deliverables shown here.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Each credit pack is a prepaid digital purchase for AI texture generation. Credits are consumed only when you run generation actions inside the application.
            </p>
          </div>
          <div className="grid gap-3">
            {includedItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                <p className="text-sm leading-6 text-[var(--muted)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">How credits work</p>
            <h2 className="mt-3 text-2xl font-semibold">One credit covers one generation action.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              New accounts include 5 starting credits. Purchased credits are added after Paddle confirms payment, and generation debits happen only when a request starts.
            </p>
          </div>
          <div className="grid gap-3">
            {usageItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                <p className="text-sm leading-6 text-[var(--muted)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Need the workspace first?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Create projects, upload references, and recharge from Account when you are ready.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[#151923] px-4 text-sm font-medium transition hover:border-[#4b5264] hover:bg-[#1d2230]"
          >
            <Sparkles className="size-4" />
            Open dashboard
          </Link>
        </div>
      </section>
    </PublicPageShell>
  );
}

import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderKanban, Moon } from "lucide-react";
import { absoluteUrl, siteConfig } from "@/lib/site-metadata";
import { PublicFooter, PublicHeader } from "./_components/public-chrome";

const features = [
  {
    icon: <FolderKanban className="size-5" />,
    title: "Project workflows",
    body: "Keep references, exclusions, generated atlases, and revisions organized.",
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: "Production maps",
    body: "Generate albedo, normal, roughness, metallic, and utility texture outputs.",
  },
  {
    icon: <Moon className="size-5" />,
    title: "Night textures",
    body: "Create emissive maps that preserve atlas layout and isolate lit windows.",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Upload building photos",
    body: "Add facade, material, and reference shots for the structure you want to turn into production textures.",
    preview: "photos",
  },
  {
    step: "02",
    title: "Create atlases and patterns",
    body: "Cloudsurf Texture AI organizes the references into texture atlases and seamless pattern candidates.",
    preview: "atlas",
  },
  {
    step: "03",
    title: "Generate PBR and night maps",
    body: "Produce supporting material maps and emissive night-lit textures for the final scenery workflow.",
    preview: "materials",
  },
];

export default function LandingPage() {
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/pricing"),
      priceCurrency: "USD",
    },
  };

  return (
    <main className="min-h-screen bg-[#090a0f] text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PublicHeader />

      <section className="border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,#162033_0,#090a0f_34rem)] px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1fr_440px] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">AI texture workspace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-6xl">Generate texture atlases for scenery production.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Cloudsurf Texture AI is a web-based texture generation service for flight-sim scenery, game environment, and architectural visualization teams. It turns building references into organized atlas workflows, PBR maps, and emissive night textures.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)]"
              >
                Start creating
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[#151923] px-5 text-sm font-medium transition hover:border-[#4b5264] hover:bg-[#1d2230]"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-6 border-b border-[var(--line)] pb-6">
              <div>
                <p className="text-sm font-semibold">Atlas workflow</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Reference to outputs</p>
              </div>
              <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-200">Ready</span>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-5">
              <TextureTile label="Albedo" className="bg-[linear-gradient(135deg,#595d5a,#b8b8ad_48%,#6d6f67)]" />
              <TextureTile label="Normal" className="bg-[linear-gradient(135deg,#253450,#6983b2_48%,#996fbc)]" />
              <TextureTile label="Roughness" className="bg-[linear-gradient(135deg,#222,#777,#c9c9c9)]" />
              <TextureTile label="Emissive" className="bg-[linear-gradient(180deg,#06080d,#06080d_44%,#f2c665_46%,#f2c665_51%,#06080d_53%)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--line)] px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[var(--accent)]">Feature process</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">From building references to production-ready texture sets.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Move from source photography to organized atlas outputs, seamless materials, PBR maps, and night-lit textures without losing the structure of your scenery workflow.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {processSteps.map((item, index) => (
              <article key={item.step} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
                <ProcessPreview variant={item.preview} />
                <div className="mt-5 flex items-center gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-bold text-[#06120b]">{item.step}</span>
                  {index < processSteps.length - 1 ? <ArrowRight className="hidden size-4 text-[var(--muted)] lg:block" /> : null}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="min-h-52 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
              <div className="flex size-11 items-center justify-center rounded-md bg-[#172033] text-[var(--accent)]">{feature.icon}</div>
              <h2 className="mt-5 text-base font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function ProcessPreview({ variant }: { variant: string }) {
  if (variant === "photos") {
    return (
      <div className="relative h-48 overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
        <div className="absolute inset-4 rounded-md bg-[linear-gradient(135deg,#29313b,#7a8584_42%,#2e3d48_43%,#121720)]" />
        <div className="absolute left-9 top-8 h-28 w-20 rounded-sm bg-[#b7bab1] shadow-xl" />
        <div className="absolute left-12 top-12 grid w-14 grid-cols-3 gap-1">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={index} className="h-3 rounded-[2px] bg-[#23303a]" />
          ))}
        </div>
        <div className="absolute bottom-5 right-5 rounded-md border border-white/10 bg-[#090a0f]/90 px-3 py-2 text-xs text-[var(--muted)]">reference photos</div>
      </div>
    );
  }

  if (variant === "atlas") {
    return (
      <div className="h-48 overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018] p-4">
        <div className="grid h-full grid-cols-4 gap-2">
          {[
            "bg-[linear-gradient(135deg,#5a5d58,#c7c4b7)]",
            "bg-[linear-gradient(135deg,#283444,#788a9c)]",
            "bg-[linear-gradient(135deg,#323232,#777,#d0d0d0)]",
            "bg-[linear-gradient(135deg,#24312f,#4c796c)]",
            "bg-[repeating-linear-gradient(90deg,#1f2b32_0_8px,#5f6e72_8px_16px)]",
            "bg-[repeating-linear-gradient(45deg,#4d4b42_0_6px,#9d9a8e_6px_12px)]",
            "bg-[linear-gradient(135deg,#151923,#394454)]",
            "bg-[linear-gradient(135deg,#6c6d65,#222831)]",
          ].map((className, index) => (
            <div key={index} className={`rounded-sm border border-white/10 ${className}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018] p-4">
      <div className="grid h-full grid-cols-2 gap-3">
        <div className="rounded-md bg-[linear-gradient(135deg,#253450,#7188b8_48%,#9b73bd)]" />
        <div className="rounded-md bg-[linear-gradient(135deg,#151515,#7d7d7d,#d7d7d7)]" />
        <div className="rounded-md bg-[linear-gradient(135deg,#171a16,#48564a,#9aa390)]" />
        <div className="rounded-md bg-[linear-gradient(180deg,#05070c,#05070c_38%,#f6cf70_40%,#f6cf70_47%,#05070c_50%)]" />
      </div>
    </div>
  );
}

function TextureTile({ label, className }: { label: string; className: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
      <div className={`h-24 ${className}`} />
      <p className="px-5 py-4 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

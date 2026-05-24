import Link from "next/link";
import { ArrowRight, CheckCircle2, FolderKanban, Moon } from "lucide-react";
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

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#090a0f] text-foreground">
      <PublicHeader />

      <section className="border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,#162033_0,#090a0f_34rem)] px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1fr_440px] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">AI texture workspace</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-6xl">Generate texture atlases for scenery production.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Cloudsurf Texture AI helps turn building references into organized atlas workflows, PBR maps, and emissive night textures.
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

function TextureTile({ label, className }: { label: string; className: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
      <div className={`h-24 ${className}`} />
      <p className="px-5 py-4 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

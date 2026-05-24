import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];
const contactHref = "mailto:contact@cloudsurf-texture-ai.0xdd.cloud";

export function PublicHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-background/86 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#090a0f]">
            <Image src="/cloudsurf-mark.png" alt="" fill sizes="40px" className="object-cover" priority />
          </span>
          <span className="truncate text-sm font-semibold">Cloudsurf Texture AI</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[#151923] hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a href={contactHref} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[#151923] hover:text-foreground">
            Contact
          </a>
          <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[#151923] hover:text-foreground">
            Login
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)]"
          >
            Dashboard
            <ArrowRight className="size-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--line)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 font-medium text-foreground">
          <span className="relative flex size-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#090a0f]">
            <Image src="/cloudsurf-mark.png" alt="" fill sizes="32px" className="object-cover" />
          </span>
          <span>Cloudsurf Texture AI</span>
        </Link>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <a href={contactHref} className="transition hover:text-foreground">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#090a0f] text-foreground">
      <PublicHeader />
      {children}
      <PublicFooter />
    </main>
  );
}

export function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="border-b border-[var(--line)] bg-[radial-gradient(circle_at_top_left,#162033_0,#090a0f_34rem)] px-4 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-medium text-[var(--accent)]">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--muted)]">{body}</p>
      </div>
    </section>
  );
}

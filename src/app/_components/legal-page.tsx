import { PageHero, PublicPageShell } from "./public-chrome";

export type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  eyebrow,
  title,
  body,
  sections,
}: {
  eyebrow: string;
  title: string;
  body: string;
  sections: LegalSection[];
}) {
  return (
    <PublicPageShell>
      <PageHero eyebrow={eyebrow} title={title} body={body} />
      <section className="px-4 py-14 sm:px-6 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 lg:sticky lg:top-6 lg:self-start">
            <p className="text-sm font-semibold">Cloudsurf Texture AI</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Last updated May 24, 2026</p>
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
              This template should be reviewed by counsel before production use.
            </p>
          </aside>
          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

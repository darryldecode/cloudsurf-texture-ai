import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react/ui";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import "@neondatabase/auth/ui/css";
import { Providers } from "@/app/providers";

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeRedirect(value: string | undefined) {
  if (!value) {
    return "/dashboard";
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/dashboard";
}

export function generateStaticParams() {
  return Object.values(authViewPaths)
    .filter((path) => path !== "sign-up")
    .map((path) => ({ path }));
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path } = await params;
  const query = await searchParams;
  const next = getSafeRedirect(getSearchValue(query.next) ?? getSearchValue(query.redirectTo) ?? getSearchValue(query.callbackURL));
  const verifyEmailHref = `/auth/verify-email?next=${encodeURIComponent(next)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)] px-4 py-10 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Providers>
          <AuthView pathname={path} />
        </Providers>

        {path === "sign-in" ? (
          <section className="rounded-lg border border-[rgb(97_211_148/0.2)] bg-[#11131b]/95 p-4 shadow-[0_18px_70px_rgb(0_0_0/0.28)]">
            <p className="text-sm font-semibold text-foreground">Email not verified?</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Send a fresh verification code, then return to your workspace after confirming your email.
            </p>
            <Link
              href={verifyEmailHref}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md border border-[rgb(97_211_148/0.36)] bg-[rgb(97_211_148/0.1)] px-4 text-sm font-semibold text-foreground transition hover:border-[var(--accent)] hover:bg-[rgb(97_211_148/0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0f]"
            >
              Send verification code
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

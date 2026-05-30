import type { Metadata } from "next";
import { EmailCodeAuthForm } from "@/components/email-code-auth-form";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Sign Up",
  ...noIndexMetadata,
};

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const next = getSearchValue(query.next) ?? getSearchValue(query.redirectTo) ?? getSearchValue(query.callbackURL) ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)] px-4 py-10 text-foreground">
      <EmailCodeAuthForm initialStep="sign-up" next={next} />
    </main>
  );
}

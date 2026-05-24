import { AuthView } from "@neondatabase/auth/react/ui";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import "@neondatabase/auth/ui/css";
import { Providers } from "@/app/providers";

export function generateStaticParams() {
  return Object.values(authViewPaths)
    .filter((path) => path !== "sign-up")
    .map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)] px-4 py-10 text-foreground">
      <Providers>
        <AuthView pathname={path} />
      </Providers>
    </main>
  );
}

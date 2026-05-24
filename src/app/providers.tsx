"use client";

import Link from "next/link";
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={(href) => window.location.assign(href)}
      replace={(href) => window.location.replace(href)}
      redirectTo="/dashboard"
      Link={({ href, children: linkChildren }) => <Link href={href}>{linkChildren}</Link>}
      defaultTheme="dark"
    >
      {children}
    </NeonAuthUIProvider>
  );
}

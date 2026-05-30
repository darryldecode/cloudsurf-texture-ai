import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Dashboard",
  ...noIndexMetadata,
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return children;
}

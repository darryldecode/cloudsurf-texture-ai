import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return children;
}

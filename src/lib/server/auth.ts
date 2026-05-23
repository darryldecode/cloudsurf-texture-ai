import { getAuth, isNeonAuthConfigured } from "@/lib/auth/server";

export async function getCurrentUser() {
  if (!isNeonAuthConfigured()) {
    return null;
  }

  const auth = await getAuth();
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
}

export async function requireUserId() {
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required.");
  }

  return user.id;
}

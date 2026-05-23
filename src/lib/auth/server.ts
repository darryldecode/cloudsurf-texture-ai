import "server-only";

const fallbackSecret = "local-neon-auth-cookie-secret-for-unconfigured-dev";
let authInstance: Awaited<ReturnType<typeof createAuthInstance>> | null = null;

export function isNeonAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

async function createAuthInstance() {
  const { createNeonAuth } = await import("@neondatabase/auth/next/server");

  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL ?? "http://localhost:3000/api/auth-disabled",
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET ?? fallbackSecret,
    },
  });
}

export async function getAuth() {
  authInstance ??= await createAuthInstance();
  return authInstance;
}

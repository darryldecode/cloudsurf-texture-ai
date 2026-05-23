import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withUser<T>(handler: (userId: string) => Promise<T>) {
  const { requireUserId } = await import("./auth");

  try {
    const userId = await requireUserId();
    return await handler(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    return jsonError(message, message === "Authentication required." ? 401 : 500);
  }
}

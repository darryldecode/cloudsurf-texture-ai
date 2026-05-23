import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/api-response";
import { getR2ImageUrl } from "@/lib/server/image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withUser(async (userId) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    const fallback = url.searchParams.get("fallback") ?? "";

    if (!key) return NextResponse.json({ url: fallback });
    if (!key.startsWith(`${userId}/`)) return NextResponse.json({ error: "Invalid asset key." }, { status: 403 });

    return NextResponse.json({ url: await getR2ImageUrl(key) });
  });
}

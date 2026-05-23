import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/api-response";
import { getCurrentUser } from "@/lib/server/auth";
import { ensureCreditAccount } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async (userId) => {
    const [user, credits] = await Promise.all([getCurrentUser(), ensureCreditAccount(userId)]);
    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
          }
        : null,
      credits: {
        balance: credits.balance,
      },
    });
  });
}

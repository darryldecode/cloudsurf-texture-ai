import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/api-response";
import { getCurrentUser } from "@/lib/server/auth";
import { ensureCreditAccount } from "@/lib/server/credits";
import { getPaddleStatus, getPublicPaddleCreditPacks } from "@/lib/server/paddle";
import { getUserGenerationSettings, parseImageAiSelection, updateUserImageAiSelection } from "@/lib/server/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async (userId) => {
    const [user, credits, settings] = await Promise.all([getCurrentUser(), ensureCreditAccount(userId), getUserGenerationSettings(userId)]);
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
      billing: getPaddleStatus(),
      creditPacks: getPublicPaddleCreditPacks(),
      settings,
    });
  });
}

export async function PATCH(request: Request) {
  return withUser(async (userId) => {
    const body = (await request.json().catch(() => ({}))) as { settings?: { imageAi?: unknown } };
    let selection;

    try {
      selection = parseImageAiSelection(body.settings?.imageAi);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Choose a valid image generation model." }, { status: 400 });
    }

    await updateUserImageAiSelection(userId, selection);
    const settings = await getUserGenerationSettings(userId);

    return NextResponse.json({ settings });
  });
}

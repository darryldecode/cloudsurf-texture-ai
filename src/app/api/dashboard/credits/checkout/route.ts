import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/api-response";
import { createPaddleCreditCheckout, getPaddleStatus, getPublicPaddleCreditPacks, paddleConfigurationMessage } from "@/lib/server/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFromRequest(request: Request) {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  return new URL(request.url).origin;
}

export async function GET() {
  return NextResponse.json({
    billing: getPaddleStatus(),
    creditPacks: getPublicPaddleCreditPacks(),
  });
}

export async function POST(request: Request) {
  const status = getPaddleStatus();
  if (!status.configured) {
    return jsonError(paddleConfigurationMessage(status), 503);
  }

  const user = await getCurrentUser();
  if (!user?.id) {
    return jsonError("Authentication required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Expected JSON body.");
  }

  const packId = String((body as { packId?: unknown }).packId ?? "");

  try {
    const checkout = await createPaddleCreditCheckout({
      userId: user.id,
      packId,
      origin: originFromRequest(request),
    });

    return NextResponse.json({
      url: checkout.checkoutUrl,
      transactionId: checkout.transactionId,
      pack: {
        id: checkout.pack.id,
        label: checkout.pack.label,
        credits: checkout.pack.credits,
        priceUsd: checkout.pack.priceUsd,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Paddle checkout.";
    return jsonError(message, message === "Unknown credit pack." ? 400 : 502);
  }
}

import { jsonError } from "@/lib/server/api-response";
import { purchaseCredits } from "@/lib/server/credits";
import { getCreditPack } from "@/lib/credit-packs";
import { type PaddleWebhookEvent, verifyPaddleSignature } from "@/lib/server/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");

  let validSignature = false;
  try {
    validSignature = verifyPaddleSignature({ rawBody, signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paddle webhook verification failed.";
    return jsonError(message, 503);
  }

  if (!validSignature) {
    return jsonError("Invalid Paddle webhook signature.", 401);
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return jsonError("Invalid Paddle webhook payload.");
  }

  if (event.event_type !== "transaction.completed") {
    return Response.json({ ok: true, ignored: true });
  }

  const customData = event.data?.custom_data;
  if (!isRecord(customData)) {
    return jsonError("Paddle transaction is missing custom credit data.");
  }

  const userId = typeof customData.userId === "string" ? customData.userId : "";
  const packId = typeof customData.packId === "string" ? customData.packId : "";
  const credits = Number(customData.credits);
  const pack = getCreditPack(packId);
  const transactionId = event.data?.id ?? event.event_id;

  if (!userId || !pack || !transactionId || credits !== pack.credits) {
    return jsonError("Paddle transaction custom credit data is invalid.");
  }

  const purchase = await purchaseCredits(userId, pack.credits, "credit_purchase", transactionId);

  return Response.json({
    ok: true,
    applied: purchase.applied,
    balance: purchase.balance,
  });
}

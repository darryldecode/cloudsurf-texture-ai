import "server-only";
import crypto from "node:crypto";
import { CREDIT_PACKS, getCreditPack, type CreditPackId } from "@/lib/credit-packs";

type PaddleEnvironment = "sandbox" | "production";

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    checkout?: {
      url?: string | null;
    } | null;
  };
  error?: {
    detail?: string;
    message?: string;
  };
};

export type PaddleWebhookEvent = {
  event_id?: string;
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    custom_data?: Record<string, unknown> | null;
  };
};

const PRICE_ENV_BY_PACK: Record<CreditPackId, string> = {
  starter: "PADDLE_STARTER_PRICE_ID",
  production: "PADDLE_PRODUCTION_PRICE_ID",
  studio: "PADDLE_STUDIO_PRICE_ID",
};

function paddleEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";
}

function paddleApiBaseUrl() {
  return paddleEnvironment() === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

function priceIdForPack(packId: CreditPackId) {
  return process.env[PRICE_ENV_BY_PACK[packId]]?.trim();
}

export function getPaddleCreditPacks() {
  return CREDIT_PACKS.map((pack) => {
    const priceId = priceIdForPack(pack.id);
    return {
      ...pack,
      priceId,
      priceEnvVar: PRICE_ENV_BY_PACK[pack.id],
      configured: Boolean(priceId),
    };
  });
}

export function getPublicPaddleCreditPacks() {
  return getPaddleCreditPacks().map((pack) => ({
    id: pack.id,
    label: pack.label,
    credits: pack.credits,
    priceUsd: pack.priceUsd,
    description: pack.description,
    priceEnvVar: pack.priceEnvVar,
    configured: pack.configured,
  }));
}

export function getPaddleStatus() {
  const apiKeyConfigured = Boolean(process.env.PADDLE_API_KEY);
  const clientTokenConfigured = Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
  const webhookConfigured = Boolean(process.env.PADDLE_WEBHOOK_SECRET);
  const packs = getPaddleCreditPacks();
  const missingPrice = packs.find((pack) => !pack.configured);
  const missingEnvVar = !apiKeyConfigured
    ? "PADDLE_API_KEY"
    : !clientTokenConfigured
      ? "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"
      : !webhookConfigured
        ? "PADDLE_WEBHOOK_SECRET"
        : missingPrice?.priceEnvVar;

  return {
    configured: !missingEnvVar,
    environment: paddleEnvironment(),
    missingEnvVar,
  };
}

export function paddleConfigurationMessage(status = getPaddleStatus()) {
  return `Paddle billing is not configured. Set ${status.missingEnvVar ?? "the missing Paddle environment variables"}.`;
}

function checkoutUrlForOrigin(origin: string) {
  const configured = process.env.PADDLE_CHECKOUT_URL?.trim();
  if (configured) return configured;

  return `${origin.replace(/\/$/, "")}/checkout`;
}

export async function createPaddleCreditCheckout({
  userId,
  packId,
  origin,
}: {
  userId: string;
  packId: string;
  origin: string;
}) {
  const pack = getCreditPack(packId);
  if (!pack) {
    throw new Error("Unknown credit pack.");
  }

  const priceId = priceIdForPack(pack.id);
  if (!priceId) {
    throw new Error(`Paddle price for "${pack.id}" is not configured. Set ${PRICE_ENV_BY_PACK[pack.id]}.`);
  }

  if (!process.env.PADDLE_API_KEY) {
    throw new Error("Paddle billing is not configured. Set PADDLE_API_KEY.");
  }

  const body = {
    collection_mode: "automatic",
    items: [{ price_id: priceId, quantity: 1 }],
    checkout: { url: checkoutUrlForOrigin(origin) },
    custom_data: {
      userId,
      packId: pack.id,
      credits: pack.credits,
    },
  };

  const response = await fetch(`${paddleApiBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as PaddleTransactionResponse;

  if (!response.ok) {
    const message = data.error?.detail ?? data.error?.message ?? JSON.stringify(data);
    throw new Error(`Paddle transaction failed with ${response.status}: ${message}`);
  }

  const checkoutUrl = data.data?.checkout?.url;
  if (!checkoutUrl) {
    throw new Error("Paddle did not return a checkout URL. Check your default payment link or PADDLE_CHECKOUT_URL.");
  }

  return {
    transactionId: data.data?.id,
    checkoutUrl,
    pack,
  };
}

function parseSignatureHeader(header: string) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value),
  );
}

export function verifyPaddleSignature({
  rawBody,
  signature,
  secret = process.env.PADDLE_WEBHOOK_SECRET,
  toleranceSeconds = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS ?? 300),
}: {
  rawBody: string;
  signature: string | null;
  secret?: string;
  toleranceSeconds?: number;
}) {
  if (!secret) {
    throw new Error("Paddle webhook secret is not configured. Set PADDLE_WEBHOOK_SECRET.");
  }

  if (!signature) return false;

  const parsed = parseSignatureHeader(signature);
  const timestamp = parsed.ts;
  const expected = parsed.h1;
  if (!timestamp || !expected) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  if (Number.isFinite(toleranceSeconds) && toleranceSeconds > 0) {
    const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
    if (ageSeconds > toleranceSeconds) return false;
  }

  const signedPayload = `${timestamp}:${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const digestBuffer = Buffer.from(digest, "hex");

  return expectedBuffer.length === digestBuffer.length && crypto.timingSafeEqual(expectedBuffer, digestBuffer);
}

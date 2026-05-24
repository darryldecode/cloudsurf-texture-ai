import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPaddleCreditCheckout, getPaddleStatus, verifyPaddleSignature } from "./paddle";

describe("Paddle billing service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.PADDLE_API_KEY;
    delete process.env.PADDLE_ENVIRONMENT;
    delete process.env.PADDLE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    delete process.env.PADDLE_STARTER_PRICE_ID;
    delete process.env.PADDLE_PRODUCTION_PRICE_ID;
    delete process.env.PADDLE_STUDIO_PRICE_ID;
    delete process.env.PADDLE_CHECKOUT_URL;
  });

  it("reports the first missing Paddle environment variable", () => {
    expect(getPaddleStatus()).toEqual({
      configured: false,
      environment: "sandbox",
      missingEnvVar: "PADDLE_API_KEY",
    });
  });

  it("creates a checkout transaction with credit custom data", async () => {
    process.env.PADDLE_API_KEY = "pdl_sdbx_apikey_test";
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "test_client_token";
    process.env.PADDLE_WEBHOOK_SECRET = "pdl_ntfset_test";
    process.env.PADDLE_STARTER_PRICE_ID = "pri_starter";
    process.env.PADDLE_PRODUCTION_PRICE_ID = "pri_production";
    process.env.PADDLE_STUDIO_PRICE_ID = "pri_studio";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "txn_123",
          checkout: { url: "http://localhost:3000/checkout?_ptxn=txn_123" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const checkout = await createPaddleCreditCheckout({
      userId: "user-1",
      packId: "starter",
      origin: "http://localhost:3000",
    });

    expect(checkout.checkoutUrl).toBe("http://localhost:3000/checkout?_ptxn=txn_123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox-api.paddle.com/transactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          collection_mode: "automatic",
          items: [{ price_id: "pri_starter", quantity: 1 }],
          checkout: { url: "http://localhost:3000/checkout" },
          custom_data: {
            userId: "user-1",
            packId: "starter",
            credits: 25,
          },
        }),
      }),
    );
  });

  it("verifies Paddle webhook signatures", () => {
    const rawBody = JSON.stringify({ event_type: "transaction.completed" });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = "pdl_ntfset_secret";
    const h1 = crypto.createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");

    expect(verifyPaddleSignature({ rawBody, signature: `ts=${timestamp};h1=${h1}`, secret })).toBe(true);
    expect(verifyPaddleSignature({ rawBody, signature: `ts=${timestamp};h1=00`, secret })).toBe(false);
  });
});

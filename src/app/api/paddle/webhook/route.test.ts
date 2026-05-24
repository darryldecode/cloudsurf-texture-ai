import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  purchaseCredits: vi.fn(),
  verifyPaddleSignature: vi.fn(),
}));

vi.mock("@/lib/server/credits", () => ({
  purchaseCredits: mocks.purchaseCredits,
}));

vi.mock("@/lib/server/paddle", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/paddle")>("@/lib/server/paddle");
  return {
    ...actual,
    verifyPaddleSignature: mocks.verifyPaddleSignature,
  };
});

import { POST } from "./route";

describe("Paddle webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPaddleSignature.mockReturnValue(true);
    mocks.purchaseCredits.mockResolvedValue({ balance: 35, applied: true });
  });

  it("rejects invalid Paddle signatures", async () => {
    mocks.verifyPaddleSignature.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/paddle/webhook", {
        method: "POST",
        headers: { "Paddle-Signature": "ts=123;h1=bad" },
        body: JSON.stringify({ event_type: "transaction.completed" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.purchaseCredits).not.toHaveBeenCalled();
  });

  it("ignores non-fulfillment events", async () => {
    const response = await POST(
      new Request("http://localhost/api/paddle/webhook", {
        method: "POST",
        headers: { "Paddle-Signature": "ts=123;h1=ok" },
        body: JSON.stringify({ event_type: "transaction.created" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, ignored: true });
    expect(mocks.purchaseCredits).not.toHaveBeenCalled();
  });

  it("adds credits for a completed transaction", async () => {
    const response = await POST(
      new Request("http://localhost/api/paddle/webhook", {
        method: "POST",
        headers: { "Paddle-Signature": "ts=123;h1=ok" },
        body: JSON.stringify({
          event_type: "transaction.completed",
          data: {
            id: "txn_123",
            custom_data: {
              userId: "user-1",
              packId: "starter",
              credits: 25,
            },
          },
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, applied: true, balance: 35 });
    expect(mocks.purchaseCredits).toHaveBeenCalledWith("user-1", 25, "credit_purchase", "txn_123");
  });
});

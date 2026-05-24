import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getPaddleStatus: vi.fn(),
  getPublicPaddleCreditPacks: vi.fn(),
  paddleConfigurationMessage: vi.fn(),
  createPaddleCreditCheckout: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/paddle", () => ({
  getPaddleStatus: mocks.getPaddleStatus,
  getPublicPaddleCreditPacks: mocks.getPublicPaddleCreditPacks,
  paddleConfigurationMessage: mocks.paddleConfigurationMessage,
  createPaddleCreditCheckout: mocks.createPaddleCreditCheckout,
}));

import { GET, POST } from "./route";

describe("credit checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "darryl@example.com" });
    mocks.getPaddleStatus.mockReturnValue({ configured: true, environment: "sandbox" });
    mocks.paddleConfigurationMessage.mockReturnValue("Paddle billing is not configured. Set PADDLE_API_KEY.");
    mocks.getPublicPaddleCreditPacks.mockReturnValue([
      {
        id: "starter",
        label: "Starter pack",
        credits: 25,
        priceUsd: 39,
        description: "For a few small texture batches.",
        priceEnvVar: "PADDLE_STARTER_PRICE_ID",
        configured: true,
      },
    ]);
    mocks.createPaddleCreditCheckout.mockResolvedValue({
      transactionId: "txn_123",
      checkoutUrl: "https://example.com/checkout?_ptxn=txn_123",
      pack: { id: "starter", label: "Starter pack", credits: 25, priceUsd: 39 },
    });
  });

  it("reports configured credit packs without exposing price ids", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.creditPacks[0]).not.toHaveProperty("priceId");
    expect(data.creditPacks[0]).toMatchObject({ id: "starter", credits: 25, priceUsd: 39, configured: true });
  });

  it("returns 503 before checkout when Paddle is not configured", async () => {
    mocks.getPaddleStatus.mockReturnValue({ configured: false, environment: "sandbox", missingEnvVar: "PADDLE_API_KEY" });

    const response = await POST(
      new Request("http://localhost/api/dashboard/credits/checkout", {
        method: "POST",
        body: JSON.stringify({ packId: "starter" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("PADDLE_API_KEY");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.createPaddleCreditCheckout).not.toHaveBeenCalled();
  });

  it("creates a Paddle checkout for the selected pack", async () => {
    const response = await POST(
      new Request("http://localhost/api/dashboard/credits/checkout", {
        method: "POST",
        body: JSON.stringify({ packId: "starter" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://example.com/checkout?_ptxn=txn_123");
    expect(mocks.createPaddleCreditCheckout).toHaveBeenCalledWith({
      userId: "user-1",
      packId: "starter",
      origin: "http://localhost",
    });
  });
});

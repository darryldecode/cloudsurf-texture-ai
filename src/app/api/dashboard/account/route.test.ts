import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureCreditAccount: vi.fn(),
  getCurrentUser: vi.fn(),
  withUser: vi.fn(),
}));

vi.mock("@/lib/server/api-response", () => ({
  withUser: mocks.withUser,
}));

vi.mock("@/lib/server/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/server/credits", () => ({
  ensureCreditAccount: mocks.ensureCreditAccount,
}));

vi.mock("@/lib/server/paddle", () => ({
  getPaddleStatus: () => ({ configured: true, environment: "sandbox" }),
  getPublicPaddleCreditPacks: () => [
    {
      id: "starter",
      label: "Starter pack",
      credits: 25,
      priceUsd: 39,
      description: "For a few small texture batches.",
      priceEnvVar: "PADDLE_STARTER_PRICE_ID",
      configured: true,
    },
  ],
}));

import { GET } from "./route";

describe("dashboard account route", () => {
  beforeEach(() => {
    mocks.withUser.mockImplementation((handler: (userId: string) => Promise<Response>) => handler("user-1"));
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Darryl",
      email: "darryl@example.com",
      image: null,
    });
    mocks.ensureCreditAccount.mockResolvedValue({ balance: 10 });
  });

  it("returns the current user profile and initializes credits", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.ensureCreditAccount).toHaveBeenCalledWith("user-1");
    expect(data).toEqual({
      user: {
        id: "user-1",
        name: "Darryl",
        email: "darryl@example.com",
        image: null,
      },
      credits: {
        balance: 10,
      },
      billing: {
        configured: true,
        environment: "sandbox",
      },
      creditPacks: [
        {
          id: "starter",
          label: "Starter pack",
          credits: 25,
          priceUsd: 39,
          description: "For a few small texture batches.",
          priceEnvVar: "PADDLE_STARTER_PRICE_ID",
          configured: true,
        },
      ],
    });
  });
});

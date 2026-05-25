import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureCreditAccount: vi.fn(),
  getUserGenerationSettings: vi.fn(),
  getCurrentUser: vi.fn(),
  updateUserImageAiSelection: vi.fn(),
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

vi.mock("@/lib/server/user-settings", () => ({
  getUserGenerationSettings: mocks.getUserGenerationSettings,
  parseImageAiSelection: (input: { provider?: string; model?: string }) => {
    if (!input?.provider || !input?.model) throw new Error("Choose a valid image generation model.");
    return input;
  },
  updateUserImageAiSelection: mocks.updateUserImageAiSelection,
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

import { GET, PATCH } from "./route";

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
    mocks.getUserGenerationSettings.mockResolvedValue({
      imageAi: { provider: "google", model: "gemini-2.5-flash-image" },
      imageModelOptions: [
        {
          provider: "google",
          model: "gemini-2.5-flash-image",
          label: "Gemini 2.5 Flash Image",
          description: "Balanced default for fast texture generation.",
        },
      ],
      imageAiStatus: {
        configured: true,
        provider: "google",
        model: "gemini-2.5-flash-image",
      },
    });
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
      settings: {
        imageAi: { provider: "google", model: "gemini-2.5-flash-image" },
        imageModelOptions: [
          {
            provider: "google",
            model: "gemini-2.5-flash-image",
            label: "Gemini 2.5 Flash Image",
            description: "Balanced default for fast texture generation.",
          },
        ],
        imageAiStatus: {
          configured: true,
          provider: "google",
          model: "gemini-2.5-flash-image",
        },
      },
    });
  });

  it("updates image generation model settings", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/dashboard/account", {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            imageAi: { provider: "google", model: "gemini-3.1-flash-image-preview" },
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateUserImageAiSelection).toHaveBeenCalledWith("user-1", {
      provider: "google",
      model: "gemini-3.1-flash-image-preview",
    });
  });
});

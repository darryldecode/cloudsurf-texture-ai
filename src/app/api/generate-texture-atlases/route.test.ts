import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/server/credits", () => ({
  debitCredit: vi.fn(),
  refundCredit: vi.fn(),
  insufficientCreditsResponse: (balance: number, required = 1) =>
    Response.json(
      {
        error: `Not enough credits. You need ${required} credit to generate.`,
        balance,
        required,
      },
      { status: 402 },
  ),
}));

vi.mock("@/lib/server/image-ai-provider", () => ({
  getImageAiStatus: vi.fn(() => ({
    configured: false,
    provider: "google",
    model: "gemini-2.5-flash-image",
    missingEnvVar: "GEMINI_API_KEY",
  })),
  imageAiConfigurationMessage: vi.fn((status: { provider: string; missingEnvVar?: string }) =>
    `Image AI provider "${status.provider}" is not configured. Set ${status.missingEnvVar}.`,
  ),
}));

vi.mock("@/lib/server/user-settings", () => ({
  ensureUserSettings: vi.fn(() => Promise.resolve({ imageAi: { provider: "google", model: "gemini-2.5-flash-image" } })),
}));

vi.mock("@/lib/server/texture-atlas-generation", () => ({
  ACCEPTED_ATLAS_IMAGE_TYPES: new Set(["image/png", "image/jpeg", "image/webp"]),
  MAX_ATLAS_IMAGES: 16,
  MAX_ATLAS_IMAGE_SIZE: 50 * 1024 * 1024,
  generateTextureAtlases: vi.fn(),
}));

import { debitCredit, refundCredit } from "@/lib/server/credits";
import { requireUserId } from "@/lib/server/auth";
import { generateTextureAtlases } from "@/lib/server/texture-atlas-generation";
import { getImageAiStatus } from "@/lib/server/image-ai-provider";
import { ensureUserSettings } from "@/lib/server/user-settings";
import { GET, POST } from "./route";

describe("texture atlas generation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(debitCredit).mockResolvedValue({ ok: true, balance: 9 });
    vi.mocked(generateTextureAtlases).mockResolvedValue([]);
    vi.mocked(ensureUserSettings).mockResolvedValue({
      userId: "user-1",
      imageAi: { provider: "google", model: "gemini-2.5-flash-image" },
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    });
    vi.mocked(getImageAiStatus).mockReturnValue({
      configured: false,
      provider: "google",
      model: "gemini-2.5-flash-image",
      missingEnvVar: "GEMINI_API_KEY",
    });
  });

  it("reports missing image AI provider configuration without crashing", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.configured).toBe(false);
    expect(data.provider).toBe("google");
    expect(data.model).toBe("gemini-2.5-flash-image");
    expect(data.missingEnvVar).toBe("GEMINI_API_KEY");
  });

  it("rejects generation when the image AI provider key is not configured", async () => {
    const formData = new FormData();
    formData.set("workflowId", "workflow-1");
    formData.set("imagePaths", "user-1/workflows/workflow-1/reference.png");

    const response = await POST(new Request("http://localhost/api/generate-texture-atlases", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("GEMINI_API_KEY");
    expect(requireUserId).toHaveBeenCalled();
    expect(ensureUserSettings).toHaveBeenCalledWith("user-1");
    expect(debitCredit).not.toHaveBeenCalled();
  });

  it("returns 402 when the account has insufficient credits", async () => {
    vi.mocked(getImageAiStatus).mockReturnValue({ configured: true, provider: "google", model: "gemini-2.5-flash-image" });
    vi.mocked(debitCredit).mockResolvedValue({ ok: false, balance: 0 });

    const formData = new FormData();
    formData.set("workflowId", "workflow-1");
    formData.set("imagePaths", "user-1/workflows/workflow-1/reference.png");

    const response = await POST(new Request("http://localhost/api/generate-texture-atlases", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data.error).toContain("Not enough credits");
    expect(generateTextureAtlases).not.toHaveBeenCalled();
  });

  it("refunds the credit when generation fails server-side", async () => {
    vi.mocked(getImageAiStatus).mockReturnValue({ configured: true, provider: "google", model: "gemini-2.5-flash-image" });
    vi.mocked(generateTextureAtlases).mockRejectedValue(new Error("OpenAI failed"));

    const formData = new FormData();
    formData.set("workflowId", "workflow-1");
    formData.set("imagePaths", "user-1/workflows/workflow-1/reference.png");

    const response = await POST(new Request("http://localhost/api/generate-texture-atlases", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("OpenAI failed");
    expect(debitCredit).toHaveBeenCalledWith("user-1", "atlas_generation", "workflow-1");
    expect(generateTextureAtlases).toHaveBeenCalledWith({
      userId: "user-1",
      workflowId: "workflow-1",
      exclusions: "",
      images: [],
      imagePaths: ["user-1/workflows/workflow-1/reference.png"],
      imageAi: { provider: "google", model: "gemini-2.5-flash-image" },
    });
    expect(refundCredit).toHaveBeenCalledWith("user-1", "atlas_generation", "workflow-1");
  });
});

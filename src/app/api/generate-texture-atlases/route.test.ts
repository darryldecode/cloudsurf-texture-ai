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

vi.mock("@/lib/server/texture-atlas-generation", () => ({
  ACCEPTED_ATLAS_IMAGE_TYPES: new Set(["image/png", "image/jpeg", "image/webp"]),
  MAX_ATLAS_IMAGES: 16,
  MAX_ATLAS_IMAGE_SIZE: 50 * 1024 * 1024,
  generateTextureAtlases: vi.fn(),
  getConfiguredImageModel: vi.fn(() => "gpt-image-1.5"),
}));

import { debitCredit, refundCredit } from "@/lib/server/credits";
import { requireUserId } from "@/lib/server/auth";
import { generateTextureAtlases } from "@/lib/server/texture-atlas-generation";
import { GET, POST } from "./route";

describe("texture atlas generation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(debitCredit).mockResolvedValue({ ok: true, balance: 9 });
    vi.mocked(generateTextureAtlases).mockResolvedValue([]);
  });

  it("reports missing OpenAI configuration without crashing", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.configured).toBe(false);
    expect(data.model).toBe("gpt-image-1.5");
  });

  it("rejects generation when OPENAI_API_KEY is not configured", async () => {
    const formData = new FormData();
    formData.set("workflowId", "workflow-1");

    const response = await POST(new Request("http://localhost/api/generate-texture-atlases", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("OPENAI_API_KEY");
    expect(requireUserId).not.toHaveBeenCalled();
    expect(debitCredit).not.toHaveBeenCalled();
  });

  it("returns 402 when the account has insufficient credits", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(generateTextureAtlases).mockRejectedValue(new Error("OpenAI failed"));

    const formData = new FormData();
    formData.set("workflowId", "workflow-1");
    formData.set("imagePaths", "user-1/workflows/workflow-1/reference.png");

    const response = await POST(new Request("http://localhost/api/generate-texture-atlases", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("OpenAI failed");
    expect(debitCredit).toHaveBeenCalledWith("user-1", "atlas_generation", "workflow-1");
    expect(refundCredit).toHaveBeenCalledWith("user-1", "atlas_generation", "workflow-1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  requireUserId: vi.fn(() => Promise.resolve("user-1")),
}));

vi.mock("@/lib/server/user-settings", () => ({
  ensureUserSettings: vi.fn(() => Promise.resolve({ imageAi: { provider: "google", model: "gemini-2.5-flash-image" } })),
}));

import { POST } from "./route";

describe("PBR generation route", () => {
  beforeEach(() => {
    delete process.env.IMAGE_AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_IMAGE_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("rejects PBR generation when the image AI provider key is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate-pbr", {
        method: "POST",
        body: JSON.stringify({
          workflowId: "workflow-1",
          atlasKind: "materials",
          texturePath: "user-1/workflows/workflow-1/materials.png",
          width: 1024,
          height: 2048,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("GEMINI_API_KEY");
  });
});

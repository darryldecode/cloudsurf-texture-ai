import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth", () => ({
  requireUserId: vi.fn(() => Promise.resolve("user-1")),
}));

vi.mock("@/lib/server/user-settings", () => ({
  ensureUserSettings: vi.fn(() => Promise.resolve({ imageAi: { provider: "google", model: "gemini-2.5-flash-image" } })),
}));

import { POST } from "./route";

describe("utility PBR generation route", () => {
  beforeEach(() => {
    delete process.env.IMAGE_AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_IMAGE_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("rejects PBR generation when the image AI provider key is not configured", async () => {
    const formData = new FormData();
    formData.set("imagePath", "user-1/utilities/sources/pbr/source.png");

    const response = await POST(new Request("http://localhost/api/utilities/generate-pbr", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("GEMINI_API_KEY");
  });

  it("rejects requests without an uploaded image", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const formData = new FormData();

    const response = await POST(new Request("http://localhost/api/utilities/generate-pbr", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Upload one image");
  });

  it("rejects non-file image fields", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const formData = new FormData();
    formData.set("image", "not an image file");

    const response = await POST(new Request("http://localhost/api/utilities/generate-pbr", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Upload one image");
  });
});

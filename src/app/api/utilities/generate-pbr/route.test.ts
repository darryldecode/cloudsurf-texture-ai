import { beforeEach, describe, expect, it } from "vitest";
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

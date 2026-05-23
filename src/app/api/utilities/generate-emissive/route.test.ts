import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("utility emissive generation route", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("rejects emissive generation when OPENAI_API_KEY is not configured", async () => {
    const formData = new FormData();

    const response = await POST(new Request("http://localhost/api/utilities/generate-emissive", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("OPENAI_API_KEY");
  });

  it("rejects requests without an uploaded image", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const formData = new FormData();

    const response = await POST(new Request("http://localhost/api/utilities/generate-emissive", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Upload one image");
  });

  it("rejects non-file image fields", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const formData = new FormData();
    formData.set("image", "not an image file");

    const response = await POST(new Request("http://localhost/api/utilities/generate-emissive", { method: "POST", body: formData }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Upload one image");
  });
});

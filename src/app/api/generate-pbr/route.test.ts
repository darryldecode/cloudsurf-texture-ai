import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("PBR generation route", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it("rejects PBR generation when OPENAI_API_KEY is not configured", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate-pbr", {
        method: "POST",
        body: JSON.stringify({
          workflowId: "workflow-1",
          atlasKind: "materials",
          textureUrl: "/storage/workflows/workflow-1/materials.png",
          width: 1024,
          height: 2048,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("OPENAI_API_KEY");
  });
});

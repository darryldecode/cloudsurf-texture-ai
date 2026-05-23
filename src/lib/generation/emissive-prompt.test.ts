import { describe, expect, it } from "vitest";
import { buildEmissivePrompt } from "./emissive-prompt";

describe("emissive prompt builder", () => {
  it("preserves layout, identifies windows, and blacks out non-emissive areas", () => {
    const prompt = buildEmissivePrompt();

    expect(prompt).toContain("Identify windows");
    expect(prompt).toContain("Preserve the source atlas composition, UV layout");
    expect(prompt).toContain("All non-emissive texture areas must be pure black or near-black");
  });
});

import { describe, expect, it } from "vitest";
import { buildSingleAtlasPrompt, buildTextureAtlasPrompt } from "@/lib/generation/prompt";

describe("texture atlas prompt builder", () => {
  it("preserves default exclusions and adds comma-separated user exclusions", () => {
    const prompt = buildTextureAtlasPrompt("see-through fence, neon sign, lamps");

    expect(prompt).toContain("EXPLICIT EXCLUSIONS");
    expect(prompt).toContain("- Pipes");
    expect(prompt).toContain("- Lamps");
    expect(prompt).toContain("- see-through fence");
    expect(prompt).toContain("- neon sign");
  });

  it("builds an atlas-specific generation instruction", () => {
    const prompt = buildSingleAtlasPrompt("lights", "materials");

    expect(prompt).toContain("Generate only ATLAS 1");
    expect(prompt).toContain("horizontal-row-based repeatable seamless material atlas");
    expect(prompt).not.toContain("Generate only ATLAS 2");
  });

  it("forbids angled facade element outputs", () => {
    const prompt = buildSingleAtlasPrompt("", "facade");

    expect(prompt).toContain("Do not output tilted, skewed, trapezoidal, perspective, underside, top-down, or side-angle views");
    expect(prompt).toContain("Every extracted element must be squared to its usable texture plane");
  });
});

import type { PbrMapKind } from "@/lib/types";

const MAP_INSTRUCTIONS: Record<PbrMapKind, string> = {
  normal:
    "Generate a tangent-space normal map for the provided architectural texture atlas. Use standard purple/blue normal-map colors. Preserve the atlas layout exactly. Do not add labels, lighting, shadows, perspective, or decorative elements.",
  roughness:
    "Generate a grayscale roughness map for the provided architectural texture atlas. White means rough/matte, black means smooth/glossy. Preserve the atlas layout exactly. Do not add labels, lighting, shadows, perspective, or decorative elements.",
  metallic:
    "Generate a grayscale metallic map for the provided architectural texture atlas. White means metallic, black means non-metallic. Most concrete, plaster, paint, glass, and masonry areas should remain black or near black unless the source atlas clearly contains metal. Preserve the atlas layout exactly. Do not add labels, lighting, shadows, perspective, or decorative elements.",
};

export function buildPbrPrompt(kind: PbrMapKind) {
  return `${MAP_INSTRUCTIONS[kind]}

This is a production PBR utility texture, not concept art.
Output one clean image only.
The output must match the source atlas composition and UV layout exactly so it can be used as a corresponding ${kind} map.`;
}

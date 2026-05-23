export function buildEmissivePrompt() {
  return `Generate an emissive night texture map from the provided architectural texture atlas image.

Identify windows, illuminated interior glass, signage, and other surfaces that should emit light at night.
Preserve the source atlas composition, UV layout, element positions, proportions, and transparent-looking gaps exactly.
Make only the identified emissive window or light areas visible with realistic warm or cool night illumination.
All non-emissive texture areas must be pure black or near-black.
Do not add labels, perspective, new facade elements, shadows, decorative borders, or lighting outside the matching atlas regions.

This is a production emissive utility texture, not concept art.
Output one clean image only.
The output must match the source atlas composition and UV layout exactly so it can be used as a corresponding emissive map.`;
}

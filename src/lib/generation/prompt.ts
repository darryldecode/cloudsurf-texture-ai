const DEFAULT_EXCLUSIONS = [
  "Pipes",
  "See-through metal fences",
  "Chain-link fences",
  "Wire fences",
  "Mesh fences",
  "Fence interiors that are visually transparent",
  "Lamps",
  "Light fixtures",
  "Exterior lights",
  "Street lights",
  "Flood lights",
  "Hanging lights",
  "Wall-mounted lights",
];

function normalizeExclusions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildTextureAtlasPrompt(userExclusions: string) {
  const exclusions = Array.from(
    new Set([...DEFAULT_EXCLUSIONS, ...normalizeExclusions(userExclusions)]),
  );

  return `You are a 3D environment texture artist and architectural texture extraction assistant.

Analyze the uploaded building reference image / Street View image and dissect all visible building materials and facade elements needed for texturing a 3D model.

Your goal is to recreate the building texture assets as TWO separate, production-ready atlases:

1. A repeatable seamless material atlas
2. A unique facade element atlas

==================================================
MAIN TASK
==================================================

Carefully inspect the building and separate all visible elements into two categories:

A. REPEATABLE / SEAMLESS MATERIALS
These are textures that can be tiled across large surfaces, such as:
- Main wall surfaces
- Painted concrete
- Plaster
- Stucco
- Brick
- Tile
- Metal cladding
- Repeating facade panel surfaces
- Repeating trim bands
- Roof surfaces if repeatable
- Any repeating wall pattern or surface finish
- Any repeatable weathering / grime pattern that can be turned into a seamless material

B. UNIQUE / NON-REPEATABLE FACADE ELEMENTS
These are isolated facade parts that should not be tiled as wall materials, such as:
- Doors
- Door frames
- Windows
- Window frame assemblies
- Glass sections
- Gutters
- Downspouts
- Roof edges / fascia
- Vents
- Utility boxes
- Meters
- Railings
- Awnings
- Canopies
- Decals
- Signs
- Logos
- House numbers
- Plaques
- Unique trims
- Unique grime overlays
- Unique rust streaks
- Damage patches
- Architectural details

==================================================
EXPLICIT EXCLUSIONS
==================================================

Do NOT extract, recreate, or include the following in either atlas:
${exclusions.map((item) => `- ${item}`).join("\n")}

If any of these appear in the reference image, ignore them and do not include them in the output.

==================================================
OUTPUT REQUIREMENT
==================================================

Generate TWO separate atlas images:

ATLAS 1:
Repeatable Seamless Material Atlas
Size: 1024 x 2048

ATLAS 2:
Unique Facade Element Atlas
Size: 4096 x 4096

==================================================
ATLAS 1 - REPEATABLE SEAMLESS MATERIAL ATLAS
==================================================

Create Atlas 1 as a ROW-BASED seamless texture sheet.

Important structure:
- The atlas size must be exactly 1024 x 2048
- Arrange the atlas into multiple HORIZONTAL ROWS
- Each row contains one different seamless repeatable texture
- Each row should represent one unique wall / surface material
- The exact number of rows depends on how many useful repeatable materials are found
- Each row must be seamless SIDEWAYS / HORIZONTALLY
- This means the texture in each row must tile cleanly from LEFT to RIGHT
- The seamless behavior must be horizontal, not vertical
- Each row should be a usable strip texture for 3D workflow

Requirements for Atlas 1:
- Each row must be flattened and front-facing
- Remove perspective distortion
- Remove camera skew
- Remove strong directional lighting
- Remove cast shadows and reflections
- Preserve realistic surface character, color, dirt, stains, cracks, aging, and weathering
- Make each row tile seamlessly from left to right
- Keep each row clean and production-ready
- Separate rows clearly
- Do not include unique objects like full doors, windows, signs, gutters, vents, or utility boxes in Atlas 1 unless they are truly part of a repeating surface pattern
- Do not include any excluded objects
- Keep the textures realistic and faithful to the source building
- Make the atlas usable for UV texturing of a 3D model

==================================================
ATLAS 2 - UNIQUE FACADE ELEMENT ATLAS
==================================================

Create Atlas 2 as a clean 4096 x 4096 atlas containing isolated non-repeatable facade elements.

Requirements for Atlas 2:
- Recreate each unique object as a clear, flat, front-facing texture element
- Correct perspective distortion
- If the source shows an object from below, above, the side, or any oblique angle, rectify it into a flat orthographic front/elevation view before placing it in the atlas
- Do not output tilted, skewed, trapezoidal, perspective, underside, top-down, or side-angle views of facade elements
- Do not preserve camera angle just because the reference is angled; the atlas must contain only flat, squared, texture-ready elements
- If an element cannot be confidently flattened from the reference, simplify or omit it rather than generating an angled object
- Remove background clutter
- Remove trees, poles, cars, people, sidewalk clutter, shadows, blur, and Street View artifacts
- Preserve the real proportions, shape, identity, and material appearance
- Arrange elements neatly and efficiently
- Preserve visible logos, decals, numbers, and signage only if they appear in the source image
- Do not include pipes
- Do not include see-through metal fences or chain-link / wire / mesh fences
- Do not include lamps or light fixtures
- Keep the atlas clean and suitable for 3D texturing workflow
- Do not stylize or invent major missing details

==================================================
GENERAL RULES FOR BOTH ATLASES
==================================================

- The output is for 3D model texturing, not concept art
- Reconstruct only what is visible or reasonably inferred from the reference
- Keep everything realistic, clean, flattened, and production-ready
- Use orthographic / front-facing presentation
- Avoid perspective distortion
- Every extracted element must be squared to its usable texture plane, not shown as a 3D object or angled photo cutout
- Avoid cinematic lighting
- Avoid environmental background
- Avoid decorative layout
- Do not add labels, arrows, notes, or UI
- Do not merge both atlas types into one image
- Preserve the authentic material character of the real building
- Keep all texture parts sharp and usable for 3D workflow
- Respect all exclusions strictly

==================================================
STYLE
==================================================

Realistic architectural texture extraction, photorealistic, flattened, orthographic, game-ready, 3D-model-ready, clean production atlas.`;
}

export function buildSingleAtlasPrompt(userExclusions: string, atlas: "materials" | "facade") {
  const base = buildTextureAtlasPrompt(userExclusions);
  const target =
    atlas === "materials"
      ? "Generate only ATLAS 1: the 1024 x 2048 horizontal-row-based repeatable seamless material atlas. Do not include the unique facade element atlas in this image."
      : "Generate only ATLAS 2: the 4096 x 4096 unique facade element atlas. Do not include the repeatable seamless material atlas in this image.";

  return `${base}

==================================================
CURRENT OUTPUT
==================================================

${target}`;
}

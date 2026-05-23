import OpenAI from "openai";
import sharp from "sharp";
import { buildSingleAtlasPrompt } from "@/lib/generation/prompt";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import type { GeneratedAtlas } from "@/lib/types";

export const MAX_ATLAS_IMAGES = 16;
export const MAX_ATLAS_IMAGE_SIZE = 50 * 1024 * 1024;
export const ACCEPTED_ATLAS_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export function getConfiguredImageModel() {
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
}

async function toPngBuffer(base64: string, width: number, height: number) {
  const input = Buffer.from(base64, "base64");
  return sharp(input)
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function createAtlasImage(
  userId: string,
  workflowId: string,
  images: File[],
  exclusions: string,
  kind: "materials" | "facade",
): Promise<GeneratedAtlas> {
  const model = getConfiguredImageModel();
  const size = kind === "materials" ? "1024x1536" : "1024x1024";
  const target = kind === "materials" ? { width: 1024, height: 2048 } : { width: 4096, height: 4096 };
  const response = await getOpenAI().images.edit({
    model,
    image: images,
    prompt: buildSingleAtlasPrompt(exclusions, kind),
    n: 1,
    size,
    quality: "high",
    output_format: "png",
  });
  const b64 = response.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI returned no image data.");
  }

  const output = await toPngBuffer(b64, target.width, target.height);
  const saved = await saveR2ImageFile({
    userId,
    pathSegments: ["workflows", workflowId, "atlases"],
    filename: `${Date.now()}-${kind}-atlas-${target.width}x${target.height}.png`,
    buffer: output,
  });

  return {
    kind,
    title: kind === "materials" ? "Repeatable Seamless Material Atlas" : "Unique Facade Element Atlas",
    width: target.width,
    height: target.height,
    model,
    url: saved.url,
    storagePath: saved.storagePath,
    generatedAt: new Date().toISOString(),
  };
}

async function filesFromStoragePaths(userId: string, storagePaths: string[]) {
  return Promise.all(
    storagePaths.map(async (storagePath) => {
      if (!storagePath.startsWith(`${userId}/`)) throw new Error("Invalid image path.");
      const buffer = await readR2ImageFile(storagePath);
      return new File([buffer], storagePath.split("/").pop() ?? "reference.png", { type: "image/png" });
    }),
  );
}

export async function generateTextureAtlases({
  userId,
  workflowId,
  exclusions,
  images = [],
  imagePaths = [],
}: {
  userId: string;
  workflowId: string;
  exclusions: string;
  images?: File[];
  imagePaths?: string[];
}) {
  const storedImages = await filesFromStoragePaths(userId, imagePaths);
  const allImages = [...images, ...storedImages];

  if (!allImages.length) {
    throw new Error("Upload at least one reference image.");
  }

  if (allImages.length > MAX_ATLAS_IMAGES) {
    throw new Error(`Upload no more than ${MAX_ATLAS_IMAGES} reference images.`);
  }

  const [materials, facade] = await Promise.all([
    createAtlasImage(userId, workflowId, allImages, exclusions, "materials"),
    createAtlasImage(userId, workflowId, allImages, exclusions, "facade"),
  ]);

  return [materials, facade];
}

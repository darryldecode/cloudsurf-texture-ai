import sharp from "sharp";
import { buildSingleAtlasPrompt } from "@/lib/generation/prompt";
import { generateImageEdit, getImageAiStatus, type ImageAiSelection } from "@/lib/server/image-ai-provider";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import type { GeneratedAtlas } from "@/lib/types";

export const MAX_ATLAS_IMAGES = 16;
export const MAX_ATLAS_IMAGE_SIZE = 50 * 1024 * 1024;
export const ACCEPTED_ATLAS_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function getConfiguredImageModel() {
  return getImageAiStatus().model;
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
  imageAi?: ImageAiSelection,
): Promise<GeneratedAtlas> {
  const size = kind === "materials" ? "1024x1536" : "1024x1024";
  const aspectRatio = kind === "materials" ? "2:3" : "1:1";
  const target = kind === "materials" ? { width: 1024, height: 2048 } : { width: 4096, height: 4096 };
  const response = await generateImageEdit(
    {
      images: images.map((image) => ({
        data: image,
        mimeType: image.type || "image/png",
        filename: image.name || `${kind}-reference.png`,
      })),
      prompt: buildSingleAtlasPrompt(exclusions, kind),
      size,
      aspectRatio,
      quality: "high",
      outputFormat: "png",
    },
    imageAi,
  );
  const output = await toPngBuffer(response.b64Json, target.width, target.height);
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
    model: response.model,
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
  imageAi,
}: {
  userId: string;
  workflowId: string;
  exclusions: string;
  images?: File[];
  imagePaths?: string[];
  imageAi?: ImageAiSelection;
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
    createAtlasImage(userId, workflowId, allImages, exclusions, "materials", imageAi),
    createAtlasImage(userId, workflowId, allImages, exclusions, "facade", imageAi),
  ]);

  return [materials, facade];
}

import sharp from "sharp";
import { NextResponse } from "next/server";
import { buildEmissivePrompt } from "@/lib/generation/emissive-prompt";
import { generateImageEdit, getImageAiStatus, imageAiConfigurationMessage, type ImageAiSelection } from "@/lib/server/image-ai-provider";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import { requireUserId } from "@/lib/server/auth";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";
import { ensureUserSettings } from "@/lib/server/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function supportedSize(width: number, height: number) {
  if (width > height) return "1536x1024";
  if (height > width) return "1024x1536";
  return "1024x1024";
}

async function normalizeUpload(image: File) {
  const input = Buffer.from(await image.arrayBuffer());
  const normalized = await sharp(input)
    .rotate()
    .png({ compressionLevel: 9 })
    .toBuffer();
  const metadata = await sharp(normalized).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read uploaded image dimensions.");
  }

  return { buffer: normalized, width: metadata.width, height: metadata.height };
}

async function generateEmissiveMap({
  userId,
  jobId,
  sourceImage,
  width,
  height,
  imageAi,
}: {
  userId: string;
  jobId: string;
  sourceImage: Buffer;
  width: number;
  height: number;
  imageAi: ImageAiSelection;
}) {
  const response = await generateImageEdit(
    {
      images: [{ data: sourceImage, mimeType: "image/png", filename: "utility-source-atlas.png" }],
      prompt: buildEmissivePrompt(),
      size: supportedSize(width, height),
      aspectRatio: aspectRatioForSize(width, height),
      quality: "high",
      outputFormat: "png",
    },
    imageAi,
  );

  const output = await sharp(Buffer.from(response.b64Json, "base64"))
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const saved = await saveR2ImageFile({
    userId,
    pathSegments: ["utilities", jobId, "emissive"],
    filename: `${Date.now()}-emissive-map-${width}x${height}.png`,
    buffer: output,
  });

  return {
    kind: "emissive",
    title: "Emissive Map",
    width,
    height,
    url: saved.url,
    storagePath: saved.storagePath,
    model: response.model,
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart form data.");
  }

  const image = formData.get("image");
  const imagePath = String(formData.get("imagePath") ?? "").trim();

  if (!(image instanceof File) && !imagePath) {
    return jsonError("Upload one image before generating an emissive map.");
  }

  if (image instanceof File && !ACCEPTED_TYPES.has(image.type)) {
    return jsonError(`${image.name} is not a supported image type.`);
  }

  if (image instanceof File && image.size > MAX_IMAGE_SIZE) {
    return jsonError(`${image.name} exceeds the 50 MB image limit.`);
  }

  try {
    const userId = await requireUserId();
    const settings = await ensureUserSettings(userId);
    const aiStatus = getImageAiStatus(settings.imageAi);
    if (!aiStatus.configured) {
      return jsonError(imageAiConfigurationMessage(aiStatus), 503);
    }

    const jobId = `utility_${crypto.randomUUID()}`;
    if (imagePath && !imagePath.startsWith(`${userId}/`)) return jsonError("Invalid image path.", 403);
    const debit = await debitCredit(userId, "utility_emissive_generation", jobId);
    if (!debit.ok) return insufficientCreditsResponse(debit.balance);

    try {
      const source = image instanceof File ? await normalizeUpload(image) : await normalizeStoredImage(imagePath);
      const emissiveMap = await generateEmissiveMap({
        userId,
        jobId,
        sourceImage: source.buffer,
        width: source.width,
        height: source.height,
        imageAi: settings.imageAi,
      });

      return NextResponse.json({ jobId, emissiveMap, credits: { balance: debit.balance } });
    } catch (error) {
      await refundCredit(userId, "utility_emissive_generation", jobId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Emissive generation failed.";
    return jsonError(message, 500);
  }
}

async function normalizeStoredImage(storagePath: string) {
  const buffer = await readR2ImageFile(storagePath);
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read uploaded image dimensions.");
  }

  return { buffer, width: metadata.width, height: metadata.height };
}

function aspectRatioForSize(width: number, height: number) {
  if (width > height) return "3:2";
  if (height > width) return "2:3";
  return "1:1";
}

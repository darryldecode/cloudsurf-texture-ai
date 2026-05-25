import sharp from "sharp";
import { NextResponse } from "next/server";
import { buildPbrPrompt } from "@/lib/generation/pbr-prompt";
import { generateImageEdit, getImageAiStatus, imageAiConfigurationMessage, type ImageAiSelection } from "@/lib/server/image-ai-provider";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import { requireUserId } from "@/lib/server/auth";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";
import { ensureUserSettings } from "@/lib/server/user-settings";
import type { PbrMapKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PBR_MAPS: PbrMapKind[] = ["metallic", "roughness", "normal"];

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

async function resizePbrOutput(base64: string, width: number, height: number, kind: PbrMapKind) {
  const image = sharp(Buffer.from(base64, "base64")).resize(width, height, { fit: "fill" });

  if (kind === "normal") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }

  return image
    .grayscale()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function generatePbrMap({
  userId,
  jobId,
  sourceImage,
  width,
  height,
  kind,
  imageAi,
}: {
  userId: string;
  jobId: string;
  sourceImage: Buffer;
  width: number;
  height: number;
  kind: PbrMapKind;
  imageAi: ImageAiSelection;
}) {
  const response = await generateImageEdit(
    {
      images: [{ data: sourceImage, mimeType: "image/png", filename: "utility-source-atlas.png" }],
      prompt: buildPbrPrompt(kind),
      size: supportedSize(width, height),
      aspectRatio: aspectRatioForSize(width, height),
      quality: "high",
      outputFormat: "png",
    },
    imageAi,
  );
  const output = await resizePbrOutput(response.b64Json, width, height, kind);
  const saved = await saveR2ImageFile({
    userId,
    pathSegments: ["utilities", jobId, "pbr"],
    filename: `${Date.now()}-${kind}-map-${width}x${height}.png`,
    buffer: output,
  });

  return {
    kind,
    title: `${kind[0].toUpperCase()}${kind.slice(1)} Map`,
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
    return jsonError("Upload one image before generating PBR maps.");
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
    const debit = await debitCredit(userId, "utility_pbr_generation", jobId);
    if (!debit.ok) return insufficientCreditsResponse(debit.balance);

    try {
      const source = image instanceof File ? await normalizeUpload(image) : await normalizeStoredImage(imagePath);
      const pbrMaps = await Promise.all(
        PBR_MAPS.map((kind) =>
          generatePbrMap({
            userId,
            jobId,
            sourceImage: source.buffer,
            width: source.width,
            height: source.height,
            kind,
            imageAi: settings.imageAi,
          }),
        ),
      );

      return NextResponse.json({ jobId, pbrMaps, credits: { balance: debit.balance } });
    } catch (error) {
      await refundCredit(userId, "utility_pbr_generation", jobId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PBR generation failed.";
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

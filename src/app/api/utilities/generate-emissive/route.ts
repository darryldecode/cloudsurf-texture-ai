import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { buildEmissivePrompt } from "@/lib/generation/emissive-prompt";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import { requireUserId } from "@/lib/server/auth";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function getConfiguredModel() {
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
}

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
}: {
  userId: string;
  jobId: string;
  sourceImage: Buffer;
  width: number;
  height: number;
}) {
  const model = getConfiguredModel();
  const image = await toFile(sourceImage, "utility-source-atlas.png", { type: "image/png" });
  const response = await getOpenAI().images.edit({
    model,
    image,
    prompt: buildEmissivePrompt(),
    n: 1,
    size: supportedSize(width, height),
    quality: "high",
    output_format: "png",
  });
  const b64 = response.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI returned no emissive map image data.");
  }

  const output = await sharp(Buffer.from(b64, "base64"))
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
    model,
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError("OPENAI_API_KEY is not configured. Add it locally to enable emissive generation.", 503);
  }

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

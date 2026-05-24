import sharp from "sharp";
import { NextResponse } from "next/server";
import { buildPbrPrompt } from "@/lib/generation/pbr-prompt";
import { generateImageEdit, getImageAiStatus, imageAiConfigurationMessage } from "@/lib/server/image-ai-provider";
import { readR2ImageFile, saveR2ImageFile } from "@/lib/server/image-storage";
import { requireUserId } from "@/lib/server/auth";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";
import type { AtlasKind, PbrMapKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PBR_MAPS: PbrMapKind[] = ["normal", "roughness", "metallic"];
const ATLAS_KINDS = new Set<AtlasKind>(["materials", "facade"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function supportedSize(width: number, height: number) {
  if (width > height) return "1536x1024";
  if (height > width) return "1024x1536";
  return "1024x1024";
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
  workflowId,
  atlasKind,
  sourceImage,
  width,
  height,
  kind,
}: {
  userId: string;
  workflowId: string;
  atlasKind: AtlasKind;
  sourceImage: Buffer;
  width: number;
  height: number;
  kind: PbrMapKind;
}) {
  const response = await generateImageEdit({
    images: [{ data: sourceImage, mimeType: "image/png", filename: `${atlasKind}-atlas.png` }],
    prompt: buildPbrPrompt(kind),
    size: supportedSize(width, height),
    aspectRatio: aspectRatioForSize(width, height),
    quality: "high",
    outputFormat: "png",
  });
  const output = await resizePbrOutput(response.b64Json, width, height, kind);
  const saved = await saveR2ImageFile({
    userId,
    pathSegments: ["workflows", workflowId, "pbr"],
    filename: `${Date.now()}-${atlasKind}-${kind}-map-${width}x${height}.png`,
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
  const aiStatus = getImageAiStatus();
  if (!aiStatus.configured) {
    return jsonError(imageAiConfigurationMessage(aiStatus), 503);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Expected JSON body.");
  }

  const payload = body as {
    workflowId?: string;
    atlasKind?: AtlasKind;
    texturePath?: string;
    width?: number;
    height?: number;
  };
  const workflowId = String(payload.workflowId ?? "").trim();
  const atlasKind = payload.atlasKind;
  const texturePath = String(payload.texturePath ?? "").trim();
  const width = Number(payload.width);
  const height = Number(payload.height);

  if (!workflowId) return jsonError("workflowId is required.");
  if (!atlasKind || !ATLAS_KINDS.has(atlasKind)) return jsonError("atlasKind is required.");
  if (!texturePath) return jsonError("texturePath is required.");
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return jsonError("width and height are required.");
  }

  try {
    const userId = await requireUserId();
    if (!texturePath.startsWith(`${userId}/`)) return jsonError("Invalid texture path.", 403);
    const debit = await debitCredit(userId, "pbr_generation", `${workflowId}:${atlasKind}`);
    if (!debit.ok) return insufficientCreditsResponse(debit.balance);

    try {
      const sourceImage = await readR2ImageFile(texturePath);
      const pbrMaps = await Promise.all(
        PBR_MAPS.map((kind) =>
          generatePbrMap({
            userId,
            workflowId,
            atlasKind,
            sourceImage,
            width,
            height,
            kind,
          }),
        ),
      );

      return NextResponse.json({ workflowId, atlasKind, pbrMaps, credits: { balance: debit.balance } });
    } catch (error) {
      await refundCredit(userId, "pbr_generation", `${workflowId}:${atlasKind}`);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PBR generation failed.";
    return jsonError(message, 500);
  }
}

function aspectRatioForSize(width: number, height: number) {
  if (width > height) return "3:2";
  if (height > width) return "2:3";
  return "1:1";
}

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import {
  ACCEPTED_ATLAS_IMAGE_TYPES,
  generateTextureAtlases,
  getConfiguredImageModel,
  MAX_ATLAS_IMAGES,
  MAX_ATLAS_IMAGE_SIZE,
} from "@/lib/server/texture-atlas-generation";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: getConfiguredImageModel(),
    acceptedTypes: Array.from(ACCEPTED_ATLAS_IMAGE_TYPES),
    maxImages: MAX_ATLAS_IMAGES,
    maxImageSize: MAX_ATLAS_IMAGE_SIZE,
  });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return jsonError("OPENAI_API_KEY is not configured. Add it locally to enable generation.", 503);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart form data.");
  }

  const workflowId = String(formData.get("workflowId") ?? "").trim();
  const exclusions = String(formData.get("exclusions") ?? "");
  const images = formData.getAll("images").filter((item): item is File => item instanceof File);
  const imagePaths = formData.getAll("imagePaths").map((item) => String(item).trim()).filter(Boolean);

  if (!workflowId) {
    return jsonError("workflowId is required.");
  }

  if (images.length === 0 && imagePaths.length === 0) {
    return jsonError("Upload at least one reference image.");
  }

  if (images.length + imagePaths.length > MAX_ATLAS_IMAGES) {
    return jsonError(`Upload no more than ${MAX_ATLAS_IMAGES} reference images.`);
  }

  for (const image of images) {
    if (!ACCEPTED_ATLAS_IMAGE_TYPES.has(image.type)) {
      return jsonError(`${image.name} is not a supported image type.`);
    }

    if (image.size > MAX_ATLAS_IMAGE_SIZE) {
      return jsonError(`${image.name} exceeds the 50 MB image limit.`);
    }
  }

  try {
    const userId = await requireUserId();
    const debit = await debitCredit(userId, "atlas_generation", workflowId);
    if (!debit.ok) return insufficientCreditsResponse(debit.balance);

    try {
      const atlases = await generateTextureAtlases({ userId, workflowId, exclusions, images, imagePaths });

      return NextResponse.json({
        workflowId,
        atlases,
        credits: { balance: debit.balance },
      });
    } catch (error) {
      await refundCredit(userId, "atlas_generation", workflowId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    return jsonError(message, 500);
  }
}

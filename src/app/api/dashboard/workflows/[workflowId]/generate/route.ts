import { after, NextResponse } from "next/server";
import { getWorkflow, saveWorkflow, touchProject } from "@/lib/server/dashboard-data";
import { withUser } from "@/lib/server/api-response";
import { generateTextureAtlases } from "@/lib/server/texture-atlas-generation";
import { debitCredit, refundCredit, insufficientCreditsResponse } from "@/lib/server/credits";
import { getImageAiStatus, imageAiConfigurationMessage } from "@/lib/server/image-ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function finishGeneration(userId: string, workflowId: string) {
  const workflow = await getWorkflow(userId, workflowId);
  if (!workflow) return;

  try {
    const imagePaths = workflow.images.map((image) => image.storagePath).filter((path): path is string => Boolean(path));
    const atlases = await generateTextureAtlases({
      userId,
      workflowId,
      exclusions: workflow.exclusions,
      imagePaths,
    });
    const completedAt = new Date().toISOString();

    await saveWorkflow(userId, {
      ...workflow,
      atlases,
      status: "complete",
      statusMessage: "Generated successfully",
      updatedAt: completedAt,
    });
    await touchProject(userId, workflow.projectId, completedAt);
  } catch (error) {
    const failedAt = new Date().toISOString();
    const latest = await getWorkflow(userId, workflowId);
    const message = error instanceof Error ? error.message : "Generation failed.";

    await refundCredit(userId, "atlas_generation", workflowId);

    if (!latest) return;

    await saveWorkflow(userId, {
      ...latest,
      status: "error",
      statusMessage: message,
      updatedAt: failedAt,
    });
    await touchProject(userId, latest.projectId, failedAt);
  }
}

export async function POST(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const aiStatus = getImageAiStatus();
  if (!aiStatus.configured) {
    return jsonError(imageAiConfigurationMessage(aiStatus), 503);
  }

  return withUser(async (userId) => {
    const { workflowId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { exclusions?: string };
    const workflow = await getWorkflow(userId, workflowId);

    if (!workflow) return jsonError("Workflow not found.", 404);
    if (!workflow.images.length) return jsonError("Upload at least one reference image before generating.");
    if (workflow.images.some((image) => !image.storagePath)) {
      return jsonError("Reference images must finish uploading before generation can continue.");
    }
    if (workflow.status === "generating") {
      return NextResponse.json({ workflow });
    }

    const debit = await debitCredit(userId, "atlas_generation", workflowId);
    if (!debit.ok) return insufficientCreditsResponse(debit.balance);

    const startedAt = new Date().toISOString();
    const nextWorkflow = {
      ...workflow,
      exclusions: body.exclusions ?? workflow.exclusions,
      status: "generating" as const,
      statusMessage: "Processing reference images",
      updatedAt: startedAt,
    };

    try {
      await saveWorkflow(userId, nextWorkflow);
      await touchProject(userId, workflow.projectId, startedAt);
    } catch (error) {
      await refundCredit(userId, "atlas_generation", workflowId);
      throw error;
    }

    after(() => finishGeneration(userId, workflowId));

    return NextResponse.json({ workflow: nextWorkflow, credits: { balance: debit.balance } });
  });
}

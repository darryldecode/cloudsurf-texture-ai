import { NextResponse } from "next/server";
import { listWorkflows, saveWorkflow } from "@/lib/server/dashboard-data";
import { withUser } from "@/lib/server/api-response";
import type { TextureWorkflow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withUser(async (userId) => {
    const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    return NextResponse.json({ workflows: await listWorkflows(userId, projectId) });
  });
}

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const body = (await request.json()) as { workflow?: TextureWorkflow };
    if (!body.workflow) return NextResponse.json({ error: "workflow is required." }, { status: 400 });
    await saveWorkflow(userId, { ...body.workflow, userId });
    return NextResponse.json({ ok: true });
  });
}

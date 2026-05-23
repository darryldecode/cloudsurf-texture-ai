import { NextResponse } from "next/server";
import { deleteProject, getProject } from "@/lib/server/dashboard-data";
import { withUser } from "@/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  return withUser(async (userId) => {
    const { projectId } = await context.params;
    return NextResponse.json({ project: await getProject(userId, projectId) });
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  return withUser(async (userId) => {
    const { projectId } = await context.params;
    await deleteProject(userId, projectId);
    return NextResponse.json({ ok: true });
  });
}

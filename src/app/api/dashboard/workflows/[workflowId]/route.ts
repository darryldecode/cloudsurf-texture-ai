import { NextResponse } from "next/server";
import { deleteWorkflow, getWorkflow } from "@/lib/server/dashboard-data";
import { withUser } from "@/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ workflowId: string }> }) {
  return withUser(async (userId) => {
    const { workflowId } = await context.params;
    return NextResponse.json({ workflow: await getWorkflow(userId, workflowId) });
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ workflowId: string }> }) {
  return withUser(async (userId) => {
    const { workflowId } = await context.params;
    const deleted = await deleteWorkflow(userId, workflowId);
    if (!deleted) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

import { NextResponse } from "next/server";
import { listProjects, saveProject } from "@/lib/server/dashboard-data";
import { withUser } from "@/lib/server/api-response";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async (userId) => NextResponse.json({ projects: await listProjects(userId) }));
}

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const body = (await request.json()) as { project?: Project };
    if (!body.project) return NextResponse.json({ error: "project is required." }, { status: 400 });
    await saveProject(userId, { ...body.project, userId });
    return NextResponse.json({ ok: true });
  });
}

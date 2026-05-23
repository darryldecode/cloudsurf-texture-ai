import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/api-response";
import { uploadR2File } from "@/lib/server/image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const formData = await request.formData();
    const workflowId = String(formData.get("workflowId") ?? "");
    const imageId = String(formData.get("imageId") ?? "");
    const file = formData.get("file");

    if (!workflowId || !imageId || !(file instanceof File)) {
      return NextResponse.json({ error: "workflowId, imageId, and file are required." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    return NextResponse.json(await uploadR2File({ userId, pathSegments: ["workflows", workflowId, "references"], filename: `${imageId}.${ext}`, file }));
  });
}

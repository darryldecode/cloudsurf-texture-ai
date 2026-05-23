import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/api-response";
import { uploadR2File } from "@/lib/server/image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "");
    const imageId = String(formData.get("imageId") ?? "");
    const file = formData.get("file");

    if ((kind !== "pbr" && kind !== "emissive") || !imageId || !(file instanceof File)) {
      return NextResponse.json({ error: "kind, imageId, and file are required." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    return NextResponse.json(await uploadR2File({ userId, pathSegments: ["utilities", "sources", kind], filename: `${imageId}.${ext}`, file }));
  });
}

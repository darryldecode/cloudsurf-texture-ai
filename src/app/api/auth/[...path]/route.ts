import { getAuth } from "@/lib/auth/server";

async function handle(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", request: Request, context: { params: Promise<{ path: string[] }> }) {
  const auth = await getAuth();
  return auth.handler()[method](request, context);
}

export function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle("GET", request, context);
}

export function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle("POST", request, context);
}

export function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle("PUT", request, context);
}

export function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle("DELETE", request, context);
}

export function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle("PATCH", request, context);
}

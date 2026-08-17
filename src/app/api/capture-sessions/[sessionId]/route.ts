import { NextResponse } from "next/server";
import {
  consumeCapturedFile,
  getCaptureSession,
  saveCapturedFile,
} from "@/lib/captureSessions";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface RouteContext {
  params: { sessionId: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getCaptureSession(params.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }

  if (!session.file) return NextResponse.json({ status: "pending" });

  const file = await consumeCapturedFile(params.sessionId);
  return NextResponse.json({ status: "ready", file });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getCaptureSession(params.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Scatta una foto." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato foto non supportato." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "La foto deve essere inferiore a 10 MB." }, { status: 413 });
  }

  const normalizedFile = new File([file], file.name || `foto-${Date.now()}.jpg`, {
    type: file.type,
  });
  const saved = await saveCapturedFile(params.sessionId, normalizedFile);

  if (!saved) {
    return NextResponse.json({ error: "Una foto è già stata inviata." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}

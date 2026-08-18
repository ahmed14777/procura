import { NextResponse } from "next/server";
import {
  canRetrieveCapture,
  getCapturedFileContent,
  getCaptureFileMetadata,
  getCaptureSession,
} from "@/lib/captureSessions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const session = await getCaptureSession(sessionId);
  const retrievalToken = new URL(request.url).searchParams.get("retrievalToken");
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }
  if (!canRetrieveCapture(session, retrievalToken)) {
    return NextResponse.json({ error: "Accesso non autorizzato." }, { status: 403 });
  }

  const metadata = getCaptureFileMetadata(session);
  const content = await getCapturedFileContent(session);
  if (!metadata || !content) {
    return NextResponse.json({ error: "Foto non disponibile." }, { status: 404 });
  }

  let body: BodyInit | null = null;
  if (Buffer.isBuffer(content)) {
    body = new Uint8Array(content).buffer;
  } else if ("statusCode" in content && content.statusCode === 200) {
    body = content.stream;
  }
  if (!body) {
    return NextResponse.json({ error: "Foto non disponibile." }, { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": metadata.type,
      "Content-Disposition": `inline; filename="${metadata.name.replace(/["\\]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

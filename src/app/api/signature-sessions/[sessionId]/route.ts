import { NextResponse } from "next/server";
import {
  consumeSignature,
  deleteSignatureSession,
  getSignatureSession,
  saveSignature,
} from "@/lib/signatureSessions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const session = await getSignatureSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }
  if (!session.signature && !session.signatureUrl) {
    return NextResponse.json({ status: "pending", clientName: session.clientName });
  }
  const retrievalToken = new URL(request.url).searchParams.get("retrievalToken");
  if (!retrievalToken) {
    return NextResponse.json(
      { error: "Questo link è già stato utilizzato e non è più valido." },
      { status: 410 },
    );
  }

  const signature = await consumeSignature(sessionId, retrievalToken);
  if (!signature) {
    return NextResponse.json({ error: "Accesso non autorizzato." }, { status: 403 });
  }
  return NextResponse.json({ status: "ready", signature });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const session = await getSignatureSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }

  const body = (await request.json()) as { signature?: string; accepted?: boolean };
  if (!body.accepted || !body.signature?.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }
  if (body.signature.length > 1_500_000) {
    return NextResponse.json({ error: "Firma troppo grande." }, { status: 413 });
  }
  if (!(await saveSignature(sessionId, body.signature))) {
    return NextResponse.json({ error: "Firma già inviata." }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const retrievalToken = new URL(request.url).searchParams.get("retrievalToken");
  if (!(await deleteSignatureSession(sessionId, retrievalToken))) {
    return NextResponse.json({ error: "Accesso non autorizzato." }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}

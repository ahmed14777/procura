import { NextResponse } from "next/server";
import { getSignatureDocument, getSignatureSession } from "@/lib/signatureSessions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const session = await getSignatureSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Sessione scaduta." }, { status: 404 });
  }
  if (session.signature || session.signatureUrl) {
    return NextResponse.json(
      { error: "Questo link è già stato utilizzato e non è più valido." },
      { status: 410 },
    );
  }

  const document = await getSignatureDocument(session);
  if (!document) {
    return NextResponse.json({ error: "Documento non disponibile." }, { status: 404 });
  }

  let body: BodyInit | null = null;
  if (Buffer.isBuffer(document)) {
    body = new Uint8Array(document).buffer;
  } else if ("statusCode" in document && document.statusCode === 200) {
    body = document.stream;
  }
  if (!body) {
    return NextResponse.json({ error: "Documento non disponibile." }, { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="procura-da-firmare.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

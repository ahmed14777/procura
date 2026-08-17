import { NextResponse } from "next/server";
import { createSignatureSession } from "@/lib/signatureSessions";

export const runtime = "nodejs";

const MAX_DOCUMENT_SIZE = 3 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const clientNameValue = formData.get("clientName");
  const document = formData.get("document");
  const clientName = typeof clientNameValue === "string" ? clientNameValue.trim() : "";
  if (!clientName || clientName.length > 120) {
    return NextResponse.json({ error: "Nome cliente non valido." }, { status: 400 });
  }
  if (!(document instanceof File) || document.type !== "application/pdf") {
    return NextResponse.json({ error: "Documento PDF non valido." }, { status: 400 });
  }
  if (document.size === 0 || document.size > MAX_DOCUMENT_SIZE) {
    return NextResponse.json({ error: "Il documento da firmare è troppo grande." }, { status: 413 });
  }

  return NextResponse.json(await createSignatureSession(clientName, document));
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { CodiceFiscaleUtils } from "@marketto/codice-fiscale-utils";
import belfioreConnector from "@marketto/belfiore-connector-embedded";
import { isCodiceFiscaleFormallyValid } from "@/lib/codiceFiscale";

export const runtime = "nodejs";

const requestSchema = z.object({
  nome: z.string().trim().min(1).max(100),
  cognome: z.string().trim().min(1).max(100),
  dataNascita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  luogoNascita: z.string().trim().min(1).max(120),
  sesso: z.enum(["M", "F"]),
});

const codiceFiscaleUtils = new CodiceFiscaleUtils(belfioreConnector);

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Completa nome, cognome, data, luogo di nascita e sesso." },
        { status: 400 },
      );
    }

    const { nome, cognome, dataNascita, luogoNascita, sesso } = parsed.data;
    const [year, month, day] = dataNascita.split("-").map(Number);
    const codiceFiscale = await codiceFiscaleUtils.parser.encodeCf({
      firstName: nome,
      lastName: cognome,
      date: new Date(Date.UTC(year, month - 1, day, 12)),
      gender: sesso,
      place: luogoNascita,
    });

    if (!codiceFiscale || !isCodiceFiscaleFormallyValid(codiceFiscale)) {
      return NextResponse.json(
        { error: "Luogo di nascita non riconosciuto. Inserisci il nome ufficiale del Comune o dello Stato estero." },
        { status: 422 },
      );
    }

    return NextResponse.json({ codiceFiscale: codiceFiscale.toUpperCase() });
  } catch (error) {
    console.error("Codice fiscale calculation error", error);
    return NextResponse.json(
      { error: "Impossibile calcolare il codice fiscale. Controlla il luogo di nascita." },
      { status: 422 },
    );
  }
}

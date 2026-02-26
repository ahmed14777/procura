import type { ProcuraFormData, TipoRichiesta } from "@/lib/schema";

/**
 * Email Generator Module
 *
 * Generates professional and legally correct PEC subject and body
 * suitable for communication with Italian public administration.
 *
 * The generated text is:
 * - Short
 * - Professional
 * - Clear
 * - Focused on getting a fast reply
 */

export interface GeneratedEmail {
  subject: string;
  body: string;
}

/**
 * Request type labels in Italian
 */
const TIPO_RICHIESTA_LABELS: Record<TipoRichiesta, string> = {
  asilo:
    "Istanza di accesso agli atti e richiesta di aggiornamento sullo stato del procedimento ",
  accesso: "Istanza di accesso agli atti",
};

/**
 * Legal references by request type
 * Note: We use only generic references without article/law numbers
 */
const RIFERIMENTI_NORMATIVI: Record<TipoRichiesta, string> = {
  asilo:
    "ai sensi della normativa vigente in materia di protezione internazionale",
  accesso:
    "ai sensi della normativa vigente in materia di accesso agli atti amministrativi",
};

/**
 * Generates the email subject line
 * Format: [Tipo richiesta] – Nome Cognome – pratica VESTANET n. XXXXX (if present)
 *
 * @param data - The form data
 * @returns Formatted subject line
 */
export function generateSubject(data: ProcuraFormData): string {
  const tipoLabel = TIPO_RICHIESTA_LABELS[data.tipoRichiesta];
  const nomeCompleto = `${data.nome} ${data.cognome}`;

  let subject = `${tipoLabel} – ${nomeCompleto}`;

  // Add Vestanet number if present
  if (data.numeroVestanet && data.numeroVestanet.trim() !== "") {
    subject += ` – pratica VESTANET n. ${data.numeroVestanet}`;
  }

  return subject;
}

/**
 * Generates the email body text
 * The body is professional, concise, and appropriate for PA communication
 *
 * @param data - The form data
 * @param commissione - The competent commission name
 * @returns Formatted email body
 */
export function generateBody(
  data: ProcuraFormData,
  commissione: string,
): string {
  const nomeCompleto = `${data.nome} ${data.cognome}`;
  const riferimento = RIFERIMENTI_NORMATIVI[data.tipoRichiesta];

  const lines: string[] = [
    `Alla Commissione Territoriale di ${commissione}`,
    "",
    `La sottoscritta Avv. Francesca Guicciardini (Foro di Milano),`,
    `in qualità di difensore del Sig./della Sig.ra ${nomeCompleto}, nato/a a ${data.luogoNascita} il ${formatDate(data.dataNascita)}${data.codiceFiscale ? `, C.F. ${data.codiceFiscale.toUpperCase()}` : ""},`,
    `giusta procura alle liti regolarmente conferita ed allegata alla presente,`,
  ];

  if (data.numeroVestanet?.trim()) {
    lines.push(
      `con riferimento alla posizione VESTANET n. ${data.numeroVestanet},`,
    );
  }

  lines.push("", `ai sensi di ${riferimento},`, "");

  if (data.tipoRichiesta === "asilo") {
    lines.push(
      "CHIEDE",
      "",
      "di conoscere lo stato attuale del procedimento di protezione internazionale e, in particolare:",
      "- se risulti fissata la convocazione innanzi alla Commissione Territoriale;",
      "- ovvero, qualora l’audizione sia stata espletata, se sia stato adottato il provvedimento conclusivo.",
      "",
      "Si chiede che ogni comunicazione inerente al procedimento venga trasmessa allo scrivente difensore",
      "a mezzo PEC all’indirizzo francesca.guicciardini@pec.it",
      "nonché mediante raccomandata A/R presso lo studio in Milano, Via Mario Pieri n. 2.",
    );
  } else {
    lines.push(
      "CHIEDE",
      "",
      "di poter prendere visione ed estrarre copia integrale del fascicolo amministrativo relativo alla posizione in oggetto,",
      "ai sensi della normativa vigente in materia di accesso agli atti.",
      "",
      "Si richiede che la documentazione e ogni ulteriore comunicazione siano trasmesse allo scrivente difensore",
      "a mezzo PEC all’indirizzo francesca.guicciardini@pec.it",
      "nonché mediante raccomandata A/R presso lo studio in Milano, Via Mario Pieri n. 2.",
    );
  }

  lines.push(
    "",
    "Si allegano:",
    "- Procura alle liti;",
    "- Documento di identità del/la richiedente.",
    "",
    "Distinti saluti.",
    "",
    "Avv. Francesca Guicciardini",
    "Foro di Milano",
  );

  return lines.join("\n");
}

/**
 * Generates both subject and body in one call
 *
 * @param data - The form data
 * @param commissione - The competent commission name
 * @returns Object with subject and body
 */
export function generateEmail(
  data: ProcuraFormData,
  commissione: string,
): GeneratedEmail {
  return {
    subject: generateSubject(data),
    body: generateBody(data, commissione),
  };
}

/**
 * Formats a date string (YYYY-MM-DD) to Italian format (DD/MM/YYYY)
 */
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

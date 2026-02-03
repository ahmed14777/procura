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
    "aggiornamento sullo stato del procedimento di protezione internazionale e Richiesta accesso agli atti ",
  accesso: "Richiesta accesso agli atti",
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

  // Build a professional email body
  const lines: string[] = [
    `Alla cortese attenzione della Commissione Territoriale di ${commissione}`,
    "",
    `Il sottoscritto ${nomeCompleto}, nato a ${data.luogoNascita} il ${formatDate(data.dataNascita)}, C.F. ${data.codiceFiscale.toUpperCase()}, rappresentato e difeso dall'Avv. Francesca Guicciardini del Foro di Milano, come da procura alle liti allegata,`,
  ];

  // Add Vestanet reference if available
  if (data.numeroVestanet && data.numeroVestanet.trim() !== "") {
    lines.push(
      `con riferimento alla pratica VESTANET n. ${data.numeroVestanet},`,
    );
  }

  // Add the appropriate request text based on type
  if (data.tipoRichiesta === "asilo") {
    lines.push(
      "",
      `${riferimento},`,
      "",
      "chiede cortesemente di conoscere, con riferimento alla fase attuale della procedura,",
      "se il richiedente risulta già convocato innanzi alla Commissione Territoriale",
      "ovvero, qualora l’audizione sia già stata svolta, se risulta adottato il provvedimento conclusivo.",
      "",
      "Si chiede, inoltre, che ogni eventuale comunicazione relativa alla fissazione della convocazione",
      "e/o alla trasmissione di documentazione e provvedimenti",
      "venga inviata allo scrivente difensore sia a mezzo PEC,",
      "sia tramite raccomandata A/R presso lo studio legale indicato in procura.",
    );
  } else {
    lines.push(
      "",
      `${riferimento},`,
      "",
      "chiede di poter prendere visione ed estrarre copia della documentazione relativa al proprio procedimento amministrativo.",
      "",
      "Si chiede, inoltre, che la trasmissione della documentazione e ogni eventuale comunicazione",
      "avvengano a mezzo PEC e, ove previsto, anche tramite raccomandata A/R",
      "presso lo studio legale indicato nella procura alle liti allegata.",
      "",
      "Si prega di voler comunicare le modalità e gli eventuali termini per l’accesso richiesto.",
    );
  }

  // Closing
  lines.push(
    "",
    "Si allegano alla presente, quali documenti essenziali ai fini dell’istruttoria:",
    "- Procura alle liti",
    "- Documento di identità del/la richiedente",
    "",
    "Con osservanza.",
    "",
    "Avv. Francesca Guicciardini",
    "Foro di Milano",
    "PEC: francesca.guicciardini@pec.it",
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

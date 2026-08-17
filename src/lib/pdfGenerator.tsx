"use client";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import type { ProcuraFormData } from "@/lib/schema";
import { AVVOCATO } from "@/data/avvocato";

const AVVOCATO_SIGNATURE_FILENAME = "francesca-firma.png";

function getAvvocatoSignatureSrc(): string {
  if (typeof window === "undefined") {
    return `/${AVVOCATO_SIGNATURE_FILENAME}`;
  }

  return new URL(
    AVVOCATO_SIGNATURE_FILENAME,
    `${window.location.origin}/`,
  ).toString();
}

/* =========================================================
  STYLES – closer to real scanned legal paper
========================================================= */

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 48,
    fontSize: 10.5,
    fontFamily: "Times-Roman",
    lineHeight: 1.35,
  },

  header: {
    textAlign: "center",
    marginBottom: 18,
  },

  studio: {
    fontSize: 11.5,
    fontWeight: "bold",
  },

  avvocato: {
    fontSize: 11.5,
    fontWeight: "bold",
    marginBottom: 6,
  },

  title: {
    fontSize: 12.5,
    fontWeight: "bold",
    marginBottom: 8,
  },

  date: {
    textAlign: "left",
    marginBottom: 8,
  },

  paragraph: {
    textAlign: "justify",
    marginBottom: 0,
  },

  emphasis: {
    fontWeight: "bold",
  },
  emphasisBold: {
    fontWeight: "extrabold",
    fontStyle: "italic",
    fontSize: 12.8,
  },

  nominoTitle: {
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 14,
  },

  block: {
    textAlign: "justify",
    marginBottom: 0,
  },
  blockSpaced: {
    textAlign: "justify",
    marginBottom: 14,
  },

  signatureArea: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureImage: {
    width: 200,
    height: 95,
    marginBottom: 2,
    alignSelf: "center",
  },
  clientSignatureImage: {
    width: 145,
    height: 55,
    objectFit: "contain",
    alignSelf: "center",
  },

  signatureBlock: {
    width: "40%",
    textAlign: "center",
  },
  signaturePreview: {
    height: 60,
    justifyContent: "flex-end",
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 5,
  },

  signatureLabel: {
    fontSize: 9.5,
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 8.8,
    lineHeight: 1.2,
  },
  autodichiarazionePage: {
    paddingTop: 54,
    paddingBottom: 56,
    paddingHorizontal: 58,
    fontSize: 11,
    fontFamily: "Times-Roman",
    lineHeight: 1.5,
  },
  autodichiarazioneHeader: {
    textAlign: "center",
    marginBottom: 22,
  },
  autodichiarazioneTitle: {
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  autodichiarazioneDate: {
    textAlign: "right",
    marginBottom: 18,
    fontSize: 10,
  },
  autodichiarazioneCard: {
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  autodichiarazioneField: {
    fontSize: 10.8,
    marginBottom: 6,
  },
  autodichiarazioneBody: {
    textAlign: "justify",
    fontSize: 11.2,
    lineHeight: 1.62,
    marginBottom: 12,
  },
  autodichiarazioneChecklist: {
    marginTop: 10,
    marginBottom: 16,
  },
  autodichiarazioneOptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  autodichiarazioneCheckbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    fontSize: 10,
    fontWeight: "bold",
  },
  autodichiarazioneOptionText: {
    flex: 1,
    fontSize: 11.1,
    lineHeight: 1.45,
    marginLeft: 10,
  },
  autodichiarazioneClosing: {
    marginTop: 18,
    fontSize: 11.2,
  },
  autodichiarazioneSignatureArea: {
    marginTop: 80,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  autodichiarazioneSignatureBlock: {
    width: "46%",
  },
  autodichiarazioneLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 6,
    height: 30,
  },
  autodichiarazioneLabel: {
    fontSize: 10,
    textAlign: "center",
  },
});

/* =========================================================
   HELPERS
========================================================= */

function formatDateItalian(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  const months = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function getCurrentDateItalian(): string {
  const now = new Date();
  const months = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/* =========================================================
   FIXED NOMINO TEXT
========================================================= */

const TESTO_NOMINO_FISSO = `quale mio difensore e procuratore speciale in ogni fase e grado, anche nelle fasi dell'esecuzione, opposizione, incidentale, cautelare, ed in sede di gravame, l’Avv. Francesca Guicciardini del Foro di Milano, C.F. GCCFNC92H43A662W, nata a Bari il 03.06.1992, con studio in Milano, Via Mario Pieri n.2, conferendole ogni più ampia facoltà di legge, ivi comprese le facoltà di transigere, conciliare, incassare, rinunciare agli atti ed accettarne la rinuncia, farsi rappresentare, assistere e sostituire, eleggere domicili, rinunziare alla comparizione delle parti, riassumere la causa, proseguirla, chiamare terzi in causa, deferire giuramento, proporre domande riconvenzionali ed azioni cautelari di qualsiasi genere e natura in corso di causa, chiedere ed accettare rendiconti, ed assumendo sin d’ora per rato e valido l’operato del suddetto legale, il quale procuratore dichiara di voler ricevere le comunicazioni a mezzo PEC: francesca.guicciardini@pec.it.

Dichiaro di essere stato informato, ai sensi dell’art. 4, co. 3, D. Lgs. n. 28/2010, della possibilità di ricorrere al procedimento di mediazione ivi previsto e dei benefici fiscali di cui agli artt. 17 e 20 del medesimo decreto, nonché dei casi in cui l’esperimento del procedimento di mediazione è condizione di procedibilità della domanda giudiziale.

Dichiaro di essere stato informato, ai sensi dell’art. 2, co. 7, D.L. n. 132/2014, della possibilità di ricorrere alla convenzione di negoziazione assistita da uno o più avvocati disciplinata dagli artt. 2 e ss. del suddetto decreto legge.

Dichiaro, ai sensi e per gli effetti di cui al D. Lgs. n. 196/2003 e s.m.i., di essere stato informato che i miei dati personali, anche sensibili, verranno utilizzati per le finalità inerenti al presente mandato, autorizzando sin d'ora il rispettivo trattamento.

Eleggo domicilio presso lo studio dell’Avv. Francesca Guicciardini, sito in Milano, Via Mario Pieri n. 2.

Dichiaro di revocare ogni precedente mandato conferito.`;

const TESTO_AUTODICHIARAZIONE_ITALIANO = `Io sottoscritto dichiaro di aver compreso in modo chiaro che il ruolo dell'ufficio Easy2Do e limitato esclusivamente al conferimento di incarico legale tramite l'avvocato incaricato, al solo fine di svolgere una delle seguenti attivita:`;

const AUTODICHIARAZIONE_OPTION_LABELS = {
  prima_udienza:
    "al fine di acquisire ogni utile informazione in merito allo stato della mia domanda di protezione internazionale e di accertare la data della prima udienza dinanzi all’Autorità competente, senza alcun potere di intervento sui tempi o sulle decisioni delle autorità competentiseguire la prima udienza relativa alla mia domanda di asilo",
  riscontro_tribunale:
    "richiedere ed acquisire copia del provvedimento conclusivo adottato dalla Commissione competente in relazione alla mia domanda di protezione internazionale, senza alcun potere di intervento sui tempi o sull’esito del procedimento",
} as const;

const TESTO_AUTODICHIARAZIONE_ITALIANO_FINALE = `Resta espressamente inteso che l’ufficio non ha alcun potere né intervento in merito ai tempi, alle udienze o all’esito del procedimento.
L’attività dell’ufficio ha natura meramente amministrativa ed è svolta nei limiti della legge italiana.

Dichiaro che il contenuto mi è stato spiegato anche in lingua araba e di averlo compreso.
Dichiaro di aver letto e accettato quanto sopra.`;

/* =========================================================
   COMPONENTS
========================================================= */

function Intestazione() {
  return (
    <View style={styles.header}>
      <Text style={styles.studio}>Studio Legale</Text>
      <Text style={styles.avvocato}>Avv. Francesca Guicciardini</Text>
      <Text style={styles.title}>PROCURA AD LITEM</Text>
    </View>
  );
}

function DataDocumento() {
  return (
    <View style={styles.date}>
      <Text>Milano, {getCurrentDateItalian()}</Text>
    </View>
  );
}

function DatiCliente({ data }: { data: ProcuraFormData }) {
  return (
    <View>
      <Text style={styles.paragraph}>
        Io sottoscritto/a{" "}
        <Text style={styles.emphasis}>
          {data.nome.toLocaleUpperCase()}
          {data.cognome.toLocaleUpperCase()
            ? " " + data.cognome.toLocaleUpperCase()
            : ""}
        </Text>
        , nato/a a <Text style={styles.emphasis}>{data.luogoNascita}</Text> il{" "}
        <Text style={styles.emphasis}>
          {formatDateItalian(data.dataNascita)}
        </Text>
        , residente{" "}
        <Text style={styles.emphasis}>
          ELET.DOM PRESSO STUDIO LEGALE GUICCIARDINI
        </Text>
        {data.codiceFiscale && (
          <>
            , VESTANET{" "}
            <Text style={styles.emphasisBold}>{data.numeroVestanet}</Text>
          </>
        )}
        {data.codiceFiscale && (
          <>
            , codice fiscale{" "}
            <Text style={styles.emphasis}>
              {data.codiceFiscale.toUpperCase()}
            </Text>
          </>
        )}
        , recapito telefonico{" "}
        <Text style={styles.emphasis}>{data.telefono}</Text>, indirizzo e-mail{" "}
        <Text style={styles.emphasis}>{data.email}</Text>.
      </Text>
    </View>
  );
}

function Nomino() {
  return (
    <View>
      <Text style={styles.nominoTitle}>NOMINO</Text>
      <Text style={styles.block}>{TESTO_NOMINO_FISSO}</Text>
    </View>
  );
}

function Firme({
  data,
  clientSignature,
}: {
  data: ProcuraFormData;
  clientSignature?: string;
}) {
  return (
    <View style={styles.signatureArea}>
      {/* Client Signature (Manual) */}
      <View style={styles.signatureBlock}>
        <View style={styles.signaturePreview}>
          {clientSignature && (
            <Image src={clientSignature} style={styles.clientSignatureImage} />
          )}
        </View>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Il/La Mandante</Text>
        <Text style={styles.signatureLabel}>
          {data.nome} {data.cognome}
        </Text>
      </View>

      {/* Lawyer Signature (Image) */}
      <View style={styles.signatureBlock}>
        <View style={styles.signaturePreview}>
          <Image
            src={getAvvocatoSignatureSrc()}
            style={styles.signatureImage}
          />
        </View>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}> {AVVOCATO.nomeCompleto}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text>Via Mario Pieri n. 2 – 20127 Milano – Tel. +39/3208799771</Text>
      <Text>C.F. {AVVOCATO.codiceFiscale} – P. IVA 10860930154</Text>
      <Text>francesca.guicciardini@gmail.com – {AVVOCATO.pec}</Text>
    </View>
  );
}

function AutodichiarazioneIntestazione() {
  return (
    <View style={styles.autodichiarazioneHeader}>
      <Text style={styles.autodichiarazioneTitle}>AUTODICHIARAZIONE</Text>
    </View>
  );
}

function AutodichiarazioneDati({ data }: { data: ProcuraFormData }) {
  return (
    <View style={styles.autodichiarazioneCard}>
      <Text style={styles.autodichiarazioneField}>
        Nome e cognome:{" "}
        <Text style={styles.emphasis}>
          {data.nome} {data.cognome}
        </Text>
      </Text>
      <Text style={styles.autodichiarazioneField}>
        Data di nascita:{" "}
        <Text style={styles.emphasis}>
          {formatDateItalian(data.dataNascita)}
        </Text>
      </Text>
      <Text style={styles.autodichiarazioneField}>
        Codice fiscale:{" "}
        <Text style={styles.emphasis}>{data.codiceFiscale.toUpperCase()}</Text>
      </Text>
    </View>
  );
}

function AutodichiarazioneTesto() {
  return (
    <View>
      <Text style={styles.autodichiarazioneBody}>
        {TESTO_AUTODICHIARAZIONE_ITALIANO}
      </Text>
      <View style={styles.autodichiarazioneChecklist}>
        <View style={styles.autodichiarazioneOptionRow}>
          <Text style={styles.autodichiarazioneCheckbox} />
          <Text style={styles.autodichiarazioneOptionText}>
            {AUTODICHIARAZIONE_OPTION_LABELS.prima_udienza}
          </Text>
        </View>
        <View style={styles.autodichiarazioneOptionRow}>
          <Text style={styles.autodichiarazioneCheckbox} />
          <Text style={styles.autodichiarazioneOptionText}>
            {AUTODICHIARAZIONE_OPTION_LABELS.riscontro_tribunale}
          </Text>
        </View>
      </View>
      <Text style={styles.autodichiarazioneBody}>
        {TESTO_AUTODICHIARAZIONE_ITALIANO_FINALE}
      </Text>
      <Text style={styles.autodichiarazioneClosing}>
        Per conferma e presa visione:
      </Text>
    </View>
  );
}

function AutodichiarazioneFirma() {
  return (
    <View style={styles.autodichiarazioneSignatureArea}>
      <View style={styles.autodichiarazioneSignatureBlock}>
        <View style={styles.autodichiarazioneLine} />
        <Text style={styles.autodichiarazioneLabel}>Firma</Text>
      </View>
    </View>
  );
}

/* =========================================================
   DOCUMENT
========================================================= */

export function ProcuraDocument({
  data,
  clientSignature,
}: {
  data: ProcuraFormData;
  clientSignature?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Intestazione />
        <DataDocumento />
        <DatiCliente data={data} />
        <Nomino />
        <Firme data={data} clientSignature={clientSignature} />
        <Footer />
      </Page>
    </Document>
  );
}

export function AutodichiarazioneDocument({ data }: { data: ProcuraFormData }) {
  return (
    <Document>
      <Page size="A4" style={styles.autodichiarazionePage}>
        <AutodichiarazioneIntestazione />
        <View style={styles.autodichiarazioneDate}>
          <Text>Milano, {getCurrentDateItalian()}</Text>
        </View>
        <AutodichiarazioneDati data={data} />
        <AutodichiarazioneTesto />
        <AutodichiarazioneFirma />
      </Page>
    </Document>
  );
}

/* =========================================================
   PDF HELPERS
========================================================= */

export async function generateProcuraPdf(
  data: ProcuraFormData,
  clientSignature?: string,
): Promise<Blob> {
  const document = <ProcuraDocument data={data} clientSignature={clientSignature} />;
  return await pdf(document).toBlob();
}

export async function generateAutodichiarazionePdf(
  data: ProcuraFormData,
): Promise<Blob> {
  const document = <AutodichiarazioneDocument data={data} />;
  return await pdf(document).toBlob();
}

export async function downloadProcuraPdf(
  data: ProcuraFormData,
  filename?: string,
  clientSignature?: string,
): Promise<void> {
  const blob = await generateProcuraPdf(data, clientSignature);

  const defaultFilename = `Procura_${data.cognome}_${data.nome}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  const finalFilename = filename || defaultFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = finalFilename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadAutodichiarazionePdf(
  data: ProcuraFormData,
  filename?: string,
): Promise<void> {
  const blob = await generateAutodichiarazionePdf(data);

  const defaultFilename = `Autodichiarazione_${data.cognome}_${data.nome}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  const finalFilename = filename || defaultFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = finalFilename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

"use client";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { ProcuraFormData } from "@/lib/schema";
import { AVVOCATO } from "@/data/avvocato";

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

  signatureArea: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureImage: {
    width: 120,
    height: 45,
    objectFit: "contain",
    marginBottom: 4,
  },

  signatureBlock: {
    width: "40%",
    textAlign: "center",
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginTop: 22,
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
          {data.nome} {data.cognome}
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

function Firme({ data }: { data: ProcuraFormData }) {
  // Use the .src property if imported via Next.js image loader,
  // or a string path if the file is in /public

  return (
    <View style={styles.signatureArea}>
      {/* Client Signature (Manual) */}
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Il/La Mandante</Text>
        <Text style={styles.signatureLabel}>
          {data.nome} {data.cognome}
        </Text>
      </View>

      {/* Lawyer Signature (Image) */}
      <View style={styles.signatureBlock}>
        {/* The Image component placed ABOVE the line */}

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

/* =========================================================
   DOCUMENT
========================================================= */

export function ProcuraDocument({ data }: { data: ProcuraFormData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Intestazione />
        <DataDocumento />
        <DatiCliente data={data} />
        <Nomino />
        <Firme data={data} />
        <Footer />
      </Page>
    </Document>
  );
}

/* =========================================================
   PDF HELPERS
========================================================= */

export async function generateProcuraPdf(data: ProcuraFormData): Promise<Blob> {
  const document = <ProcuraDocument data={data} />;
  return await pdf(document).toBlob();
}

export async function downloadProcuraPdf(
  data: ProcuraFormData,
  filename?: string,
): Promise<void> {
  const blob = await generateProcuraPdf(data);

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

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
   Styles – classic legal layout (like scanned document)
========================================================= */

const styles = StyleSheet.create({
  page: {
    paddingTop: 25,
    paddingBottom: 25,
    paddingHorizontal: 50,
    fontSize: 11,
    fontFamily: "Times-Roman",
    lineHeight: 1.4,
  },

  header: {
    textAlign: "center",
    marginBottom: 20,
  },

  studio: {
    fontSize: 12,
    fontWeight: "bold",
  },

  avvocato: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },

  title: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 16,
  },

  date: {
    textAlign: "left",
    marginBottom: 14,
  },

  paragraph: {
    textAlign: "justify",
    marginBottom: 8,
  },
  paragraphEmphasis: {
    textAlign: "justify",
    marginBottom: 8,
    fontWeight: "bold",
  },

  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },

  bullet: {
    width: 10,
  },

  listText: {
    flex: 1,
    textAlign: "justify",
  },

  signatureArea: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  signatureBlock: {
    width: "40%",
    textAlign: "center",
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginTop: 25,
    marginBottom: 6,
  },

  signatureLabel: {
    fontSize: 10,
  },

  veraFirma: {
    textAlign: "right",
    marginTop: 20,
    fontWeight: "bold",

    marginBottom: 10,
    fontSize: 10,
  },

  footer: {
    position: "absolute",
    bottom: 25,
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 9,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
});

/* =========================================================
   Helpers
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
  const day = now.getDate();
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
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  return `${day} ${month} ${year}`;
}

/* =========================================================
   Blocks
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

/* -------- main body (merged like the real paper) -------- */

function CorpoPrincipale({ data }: { data: ProcuraFormData }) {
  const vestanetLine = data.numeroVestanet
    ? `, pratica VESTANET n. ${data.numeroVestanet}`
    : "";

  return (
    <View>
      <Text style={styles.paragraph}>
        Io sottoscritto/a{" "}
        <Text style={styles.paragraphEmphasis}>
          {data.nome} {data.cognome}
        </Text>
        , nato/a a{" "}
        <Text style={styles.paragraphEmphasis}>{data.luogoNascita}</Text> il{" "}
        <Text style={styles.paragraphEmphasis}>
          {formatDateItalian(data.dataNascita)}
        </Text>
        , residente{" "}
        <Text style={styles.paragraphEmphasis}>
          ELET.DOM PRESSO STUDIO LEGALE GUICCIARDINI
        </Text>
        , codice fiscale{" "}
        <Text style={styles.paragraphEmphasis}>
          {data.codiceFiscale.toUpperCase()}
        </Text>
        {vestanetLine && (
          <>
            ,{" "}
            <Text style={styles.paragraphEmphasis}>
              pratica VESTANET n. {data.numeroVestanet}
            </Text>
          </>
        )}
        .
      </Text>

      <Text style={styles.paragraph}>
        nomino quale mio difensore e procuratore speciale in ogni fase e grado
        del giudizio, anche nelle fasi dell’esecuzione, opposizione,
        incidentale, cautelare ed in sede di gravame, l’Avv.{" "}
        {AVVOCATO.nomeCompleto}, del Foro di {AVVOCATO.foro}, C.F.{" "}
        {AVVOCATO.codiceFiscale}, con studio in {AVVOCATO.studio}, conferendogli
        ogni più ampia facoltà di legge.
      </Text>

      <Text style={styles.paragraph}>
        Nominandolo/a affinché mi rappresenti e difenda in ogni fase e grado del
        giudizio, ivi compresi l’esecuzione forzata, l’azione esecutiva e
        cautelare, e in ogni altro procedimento connesso e/o conseguente, nonché
        in sede di conciliazione e mediazione.
      </Text>
    </View>
  );
}

/* ---------------- powers ---------------- */

function Facolta() {
  const poteri = [
    "proporre domande, anche riconvenzionali, e relative eccezioni;",
    "chiamare in causa terzi;",
    "proporre e accettare transazioni e conciliazioni;",
    "incassare somme e rilasciare quietanze;",
    "rinunciare agli atti ed accettare la rinuncia;",
    "farsi rappresentare e sostituire;",
    "e compiere ogni altro atto ritenuto utile per la tutela dei miei diritti.",
  ];

  return (
    <View>
      {poteri.map((p, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.bullet}>–</Text>
          <Text style={styles.listText}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------------- sections ---------------- */

function ElezioneDomicilio() {
  return (
    <View>
      <Text style={styles.paragraph}>
        Eleggo domicilio presso lo studio dell’Avv. {AVVOCATO.nomeCompleto},
        sito in {AVVOCATO.studio}.
      </Text>
    </View>
  );
}

function Comunicazioni() {
  return (
    <View>
      <Text style={styles.paragraph}>
        Il sottoscritto dichiara di voler ricevere le comunicazioni a mezzo PEC:{" "}
        {AVVOCATO.pec}.
      </Text>
    </View>
  );
}

function Privacy() {
  return (
    <View>
      <Text style={styles.paragraph}>
        Dichiaro, ai sensi e per gli effetti del Regolamento UE 2016/679 (GDPR)
        e del D.Lgs. 196/2003 e s.m.i., di essere stato informato che i miei
        dati personali, anche sensibili, verranno trattati per le finalità
        inerenti al presente mandato.
      </Text>
    </View>
  );
}

function Revoca() {
  return (
    <View>
      <Text style={styles.paragraph}>
        Dichiaro di revocare ogni precedente mandato conferito.
      </Text>
    </View>
  );
}

/* ---------------- signatures ---------------- */

function VeraFirma() {
  return (
    <View>
      <Text style={styles.veraFirma}>Vera ed autentica firma</Text>
    </View>
  );
}

function Firme({ data }: { data: ProcuraFormData }) {
  return (
    <View style={styles.signatureArea}>
      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Il/La Mandante</Text>
        <Text style={styles.signatureLabel}>
          {data.nome} {data.cognome}
        </Text>
      </View>

      <View style={styles.signatureBlock}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureLabel}>Avv. {AVVOCATO.nomeCompleto}</Text>
      </View>
    </View>
  );
}

/* ---------------- footer ---------------- */

function Footer() {
  return (
    <View style={styles.footer}>
      <Text>Via Mario Pieri n. 2 – 20127 Milano – Tel. 02/49424384</Text>
      <Text>C.F. {AVVOCATO.codiceFiscale} – P. IVA 10860930154</Text>
      <Text>francesca.guicciardini@gmail.com – {AVVOCATO.pec}</Text>
    </View>
  );
}

/* =========================================================
   Document
========================================================= */

export function ProcuraDocument({ data }: { data: ProcuraFormData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Intestazione />
        <DataDocumento />
        <CorpoPrincipale data={data} />
        <Facolta />
        <ElezioneDomicilio />
        <Comunicazioni />
        <Privacy />
        <Revoca />
        <VeraFirma />
        <Firme data={data} />
        <Footer />
      </Page>
    </Document>
  );
}

/* =========================================================
   PDF generation helpers
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

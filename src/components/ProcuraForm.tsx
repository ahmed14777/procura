"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getSediOrdinatePerRegione,
  type SedeSelezionabile,
} from "@/data/commissioni";
import type { ProcuraFormData, TipoRichiesta } from "@/lib/schema";
import { downloadImageAsPdf } from "@/lib/imageToPdf";
import { generateProcuraPdf } from "@/lib/pdfGenerator";
import { isCodiceFiscaleFormallyValid, normalizeCodiceFiscale } from "@/lib/codiceFiscale";
import QRCode from "qrcode";

interface ProcuraFormProps {
  onSubmitPdfOnly: (data: ProcuraFormData, clientSignature?: string) => void;
  onSubmitAutodichiarazione: (data: ProcuraFormData) => void;
  onSubmitAll: (
    data: ProcuraFormData,
    clientSignature: string | undefined,
    sourceDocument: File,
  ) => void;
  onSimulate: (sedeId: string) => void;
  onNewPractice: () => void;
  isLoading: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
}

type ExtractableField =
  | "nome"
  | "cognome"
  | "dataNascita"
  | "luogoNascita"
  | "codiceFiscale"
  | "telefono"
  | "email"
  | "numeroVestanet";

type ExtractedData = Partial<Record<ExtractableField, string>>;

interface DocumentPreview {
  url: string;
  name: string;
  type: string;
}

interface CaptureSessionView {
  id: string;
  qrCode: string;
  captureUrl: string;
  retrievalToken: string;
}

type SignatureSessionView = CaptureSessionView;

const INITIAL_FORM_DATA = {
  nome: "",
  cognome: "",
  dataNascita: "",
  luogoNascita: "",
  codiceFiscale: "",
  telefono: "",
  email: "",
  numeroVestanet: "",
  sedeSelezionata: "",
  tipoRichiesta: "asilo" as TipoRichiesta,
};

/**
 * ProcuraForm Component
 *
 * The main form for entering client data.
 * Validates input using Zod schema and provides two submission modes:
 * - Download PDF only
 * - Generate everything (PDF + PEC + Email)
 */
export function ProcuraForm({
  onSubmitPdfOnly,
  onSubmitAutodichiarazione,
  onSubmitAll,
  onSimulate,
  onNewPractice,
  isLoading,
}: ProcuraFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] =
    useState<DocumentPreview | null>(null);
  const [sourceDocument, setSourceDocument] = useState<File | null>(null);
  const [isConvertingImage, setIsConvertingImage] = useState(false);
  const [captureSession, setCaptureSession] =
    useState<CaptureSessionView | null>(null);
  const [isCreatingCaptureSession, setIsCreatingCaptureSession] =
    useState(false);
  const [signatureSession, setSignatureSession] =
    useState<SignatureSessionView | null>(null);
  const [isCreatingSignatureSession, setIsCreatingSignatureSession] =
    useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [signatureLinkCopied, setSignatureLinkCopied] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<ExtractableField[]>([]);
  const [extractedDataConfirmed, setExtractedDataConfirmed] = useState(true);
  const [fiscalCodeGender, setFiscalCodeGender] = useState<"" | "M" | "F">("");
  const [isCalculatingFiscalCode, setIsCalculatingFiscalCode] = useState(false);
  const [fiscalCodeMessage, setFiscalCodeMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
    const touchDevice = navigator.maxTouchPoints > 1;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setIsMobileDevice(mobileUserAgent || (touchDevice && coarsePointer));
  }, []);

  useEffect(() => {
    return () => {
      if (documentPreview) URL.revokeObjectURL(documentPreview.url);
    };
  }, [documentPreview]);

  const closeDocumentPreview = () => setDocumentPreview(null);

  const startNewPractice = () => {
    const hasCurrentWork = Object.values(formData).some(
      (value) => value !== "" && value !== "asilo",
    ) || Boolean(sourceDocument || clientSignature || captureSession || signatureSession);

    if (hasCurrentWork && !window.confirm("Iniziare una nuova pratica? I dati attuali verranno cancellati.")) {
      return;
    }

    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setTouched({});
    setExtractionMessage(null);
    setDocumentPreview(null);
    setSourceDocument(null);
    setCaptureSession(null);
    setSignatureSession(null);
    setClientSignature(null);
    setSignatureLinkCopied(false);
    setAiFilledFields([]);
    setExtractedDataConfirmed(true);
    setFiscalCodeGender("");
    setFiscalCodeMessage(null);
    setCopiedField(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onNewPractice();
  };

  const handleDownloadImagePdf = async () => {
    if (!documentPreview || documentPreview.type === "application/pdf") return;

    setIsConvertingImage(true);
    try {
      await downloadImageAsPdf(documentPreview.url, documentPreview.name);
    } catch {
      setExtractionMessage({
        type: "error",
        text: "Impossibile convertire l'immagine in PDF.",
      });
    } finally {
      setIsConvertingImage(false);
    }
  };

  const copyField = async (field: string, value: string) => {
    if (!value.trim()) return;

    try {
      await navigator.clipboard.writeText(value.trim());
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1600);
    } catch {
      setExtractionMessage({
        type: "error",
        text: "Impossibile copiare il dato. Selezionalo manualmente.",
      });
    }
  };

  const CopyButton = ({ field, value }: { field: string; value: string }) => (
    <button
      type="button"
      onClick={() => copyField(field, value)}
      disabled={!value.trim()}
      aria-label={`Copia ${field}`}
      className="inline-flex min-w-[58px] items-center justify-center rounded-md border border-slate-600/70 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-sky-400/50 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {copiedField === field ? "Copiato ✓" : "Copia"}
    </button>
  );

  const processDocument = async (file: File) => {
    setIsExtracting(true);
    setExtractionMessage(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/extract-document", { method: "POST", body });
      const result = (await response.json()) as { data?: ExtractedData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "Analisi non riuscita.");

      const fieldsFilledByAI = (Object.entries(result.data) as Array<
        [ExtractableField, string]
      >)
        .filter(([key, value]) => value?.trim() && !formData[key].trim())
        .map(([key]) => key);

      setFormData((current) => {
        const next = { ...current };
        for (const [key, value] of Object.entries(result.data ?? {}) as Array<
          [ExtractableField, string]
        >) {
          if (value?.trim() && !current[key].trim()) {
            next[key] = key === "codiceFiscale" ? value.trim().toUpperCase() : value.trim();
          }
        }
        return next;
      });
      setExtractionMessage({
        type: "success",
        text: fieldsFilledByAI.length > 0
          ? `${fieldsFilledByAI.length} campi compilati. Controlla i dati evidenziati.`
          : "Nessun campo vuoto compilabile trovato. Controlla il documento.",
      });
      setAiFilledFields(fieldsFilledByAI);
      setExtractedDataConfirmed(fieldsFilledByAI.length === 0);
      setDocumentPreview({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
      });
      setSourceDocument(file);
    } catch (error) {
      setExtractionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Errore durante l'analisi.",
      });
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processDocument(file);
  };

  const calculateFiscalCode = async () => {
    if (!formData.nome.trim() || !formData.cognome.trim() || !formData.dataNascita || !formData.luogoNascita.trim() || !fiscalCodeGender) {
      setFiscalCodeMessage({
        type: "error",
        text: "Completa nome, cognome, data, luogo di nascita e seleziona il sesso.",
      });
      return;
    }

    setIsCalculatingFiscalCode(true);
    setFiscalCodeMessage(null);
    try {
      const response = await fetch("/api/codice-fiscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          cognome: formData.cognome,
          dataNascita: formData.dataNascita,
          luogoNascita: formData.luogoNascita,
          sesso: fiscalCodeGender,
        }),
      });
      const result = (await response.json()) as { codiceFiscale?: string; error?: string };
      if (!response.ok || !result.codiceFiscale) {
        throw new Error(result.error || "Calcolo non riuscito.");
      }
      const current = normalizeCodiceFiscale(formData.codiceFiscale);
      if (current && current !== result.codiceFiscale && !window.confirm("Sostituire il codice fiscale già inserito con quello calcolato?")) {
        return;
      }
      setFormData((previous) => ({ ...previous, codiceFiscale: result.codiceFiscale! }));
      setErrors((previous) => ({ ...previous, codiceFiscale: undefined }));
      setTouched((previous) => ({ ...previous, codiceFiscale: true }));
      setFiscalCodeMessage({
        type: "success",
        text: "Codice calcolato. Confrontalo sempre con quello rilasciato dall’Agenzia delle Entrate.",
      });
    } catch (error) {
      setFiscalCodeMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Calcolo non riuscito.",
      });
    } finally {
      setIsCalculatingFiscalCode(false);
    }
  };

  const createPhoneCaptureSession = async () => {
    setIsCreatingCaptureSession(true);
    setExtractionMessage(null);
    try {
      const response = await fetch("/api/capture-sessions", { method: "POST" });
      const result = (await response.json()) as {
        id?: string;
        retrievalToken?: string;
        error?: string;
      };
      if (!response.ok || !result.id || !result.retrievalToken) {
        throw new Error(result.error || "Sessione non disponibile.");
      }

      const captureUrl = `${window.location.origin}/capture/${result.id}`;
      const qrCode = await QRCode.toDataURL(captureUrl, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setCaptureSession({ id: result.id, qrCode, captureUrl, retrievalToken: result.retrievalToken });
    } catch (error) {
      setExtractionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Impossibile creare il QR.",
      });
    } finally {
      setIsCreatingCaptureSession(false);
    }
  };

  useEffect(() => {
    if (!captureSession) return;
    let stopped = false;

    const checkForPhoto = async () => {
      try {
        const response = await fetch(
          `/api/capture-sessions/${captureSession.id}?retrievalToken=${encodeURIComponent(captureSession.retrievalToken)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as {
          status?: "pending" | "ready";
          error?: string;
          file?: { url: string; name: string; type: string };
        };

        if (response.status === 404) {
          if (!stopped) {
            setCaptureSession(null);
            setExtractionMessage({ type: "error", text: "Il QR è scaduto. Creane uno nuovo." });
          }
          return;
        }
        if (!response.ok) {
          throw new Error(result.error || "Impossibile ricevere la foto dal telefono.");
        }

        if (result.status === "ready" && result.file && !stopped) {
          stopped = true;
          const fileResponse = await fetch(result.file.url, { cache: "no-store" });
          if (!fileResponse.ok) throw new Error("Impossibile scaricare la foto dal telefono.");
          const blob = await fileResponse.blob();
          const file = new File([blob], result.file.name, { type: result.file.type });
          await processDocument(file);
          setCaptureSession(null);
          void fetch(
            `/api/capture-sessions/${captureSession.id}?retrievalToken=${encodeURIComponent(captureSession.retrievalToken)}`,
            { method: "DELETE" },
          );
        }
      } catch (error) {
        if (!stopped && error instanceof Error) {
          setExtractionMessage({ type: "error", text: error.message });
        }
      }
    };

    void checkForPhoto();
    const interval = window.setInterval(checkForPhoto, 3000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
    // processDocument intentionally uses the latest component state when a photo arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureSession?.id]);

  const createClientSignatureSession = async () => {
    if (!validateAll()) return;

    setIsCreatingSignatureSession(true);
    setExtractionMessage(null);
    try {
      const data = buildSubmitData();
      const procuraBlob = await generateProcuraPdf(data);
      const requestBody = new FormData();
      requestBody.append("clientName", `${data.nome} ${data.cognome}`);
      requestBody.append(
        "document",
        new File([procuraBlob], "procura-da-firmare.pdf", {
          type: "application/pdf",
        }),
      );
      const response = await fetch("/api/signature-sessions", {
        method: "POST",
        body: requestBody,
      });
      const result = (await response.json()) as {
        id?: string;
        retrievalToken?: string;
        error?: string;
      };
      if (!response.ok || !result.id || !result.retrievalToken) {
        throw new Error(result.error || "Sessione firma non disponibile.");
      }

      const captureUrl = `${window.location.origin}/sign/${result.id}`;
      const qrCode = await QRCode.toDataURL(captureUrl, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setClientSignature(null);
      setSignatureLinkCopied(false);
      setSignatureSession({
        id: result.id,
        qrCode,
        captureUrl,
        retrievalToken: result.retrievalToken,
      });
    } catch (error) {
      setExtractionMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Impossibile creare il QR firma.",
      });
    } finally {
      setIsCreatingSignatureSession(false);
    }
  };

  useEffect(() => {
    if (!signatureSession) return;
    let stopped = false;

    const checkForSignature = async () => {
      try {
        const response = await fetch(
          `/api/signature-sessions/${signatureSession.id}?retrievalToken=${encodeURIComponent(signatureSession.retrievalToken)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as {
          status?: "pending" | "ready";
          signature?: string;
          error?: string;
        };

        if (response.status === 404) {
          if (!stopped) {
            setSignatureSession(null);
            setExtractionMessage({ type: "error", text: "Il QR firma è scaduto. Creane uno nuovo." });
          }
          return;
        }
        if (!response.ok) {
          throw new Error(result.error || "Impossibile ricevere la firma dal telefono.");
        }

        if (result.status === "ready" && result.signature && !stopped) {
          stopped = true;
          setClientSignature(result.signature);
          setSignatureSession(null);
          void fetch(
            `/api/signature-sessions/${signatureSession.id}?retrievalToken=${encodeURIComponent(signatureSession.retrievalToken)}`,
            { method: "DELETE" },
          );
        }
      } catch (error) {
        if (!stopped && error instanceof Error) {
          setExtractionMessage({ type: "error", text: error.message });
        }
      }
    };

    void checkForSignature();
    const interval = window.setInterval(checkForSignature, 3000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [signatureSession?.id]);

  const copySignatureLink = async () => {
    if (!signatureSession) return;
    try {
      await navigator.clipboard.writeText(signatureSession.captureUrl);
      setSignatureLinkCopied(true);
      window.setTimeout(() => setSignatureLinkCopied(false), 1800);
    } catch {
      window.prompt("Copia il link della firma:", signatureSession.captureUrl);
    }
  };

  const shareSignatureLinkOnWhatsApp = () => {
    if (!signatureSession) return;
    const clientName = `${formData.nome} ${formData.cognome}`.trim();
    const message = `Buongiorno ${clientName}, apri questo link per firmare la Procura. Il link è personale e utilizzabile una sola volta: ${signatureSession.captureUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const buildSubmitData = (): ProcuraFormData => ({
    ...formData,
    nome: formData.nome.trim(),
    cognome: formData.cognome.trim(),
    luogoNascita: formData.luogoNascita.trim(),
    codiceFiscale: formData.codiceFiscale.trim().toUpperCase(),
    telefono: formData.telefono.trim().replace(/\s+/g, ""),
    email: formData.email.trim(),
    numeroVestanet: formData.numeroVestanet.trim().toUpperCase(),
  });

  // Get sorted locations grouped by region
  const sediPerRegione = useMemo(() => {
    const sedi = getSediOrdinatePerRegione();
    const grouped: { [region: string]: SedeSelezionabile[] } = {};

    for (const sede of sedi) {
      const region = sede.regione || "Altro";
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(sede);
    }

    return grouped;
  }, []);

  // Validation function
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "nome":
        if (!value.trim()) return "Il nome è obbligatorio";
        if (value.length < 2) return "Il nome deve avere almeno 2 caratteri";
        if (!/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/.test(value))
          return "Il nome contiene caratteri non validi";
        break;
      case "cognome":
        if (!value.trim()) return "Il cognome è obbligatorio";
        if (value.length < 2) return "Il cognome deve avere almeno 2 caratteri";
        if (!/^[a-zA-Z\s'-]+$/.test(value))
          return "Il cognome contiene caratteri non validi";
        break;
      case "dataNascita": {
        if (!value) return "La data di nascita è obbligatoria";
        const date = new Date(value);
        if (date >= new Date()) return "La data deve essere nel passato";
        break;
      }
      case "luogoNascita":
        if (!value.trim()) return "Il luogo di nascita è obbligatorio";
        break;
      case "codiceFiscale":
        if (!value.trim()) return "Il codice fiscale è obbligatorio";
        if (!isCodiceFiscaleFormallyValid(value)) return "Il codice fiscale non è formalmente valido";
        break;
      case "sedeSelezionata":
        if (!value) return "La sede è obbligatoria";
        break;
      case "numeroVestanet":
        if (!value.trim()) return "Il numero Vestanet è obbligatorio";
        if (!/^[A-Z]{2}[0-9]+$/.test(value.trim().toUpperCase()))
          return "Deve iniziare con due lettere seguite solo da numeri (es. AB12345)";
        break;
      case "telefono":
        if (!value.trim()) return "Il telefono è obbligatorio";
        if (!/^(\+?[0-9]{8,15})$/.test(value.trim().replace(/\s+/g, "")))
          return "Numero di telefono non valido";
        break;

      case "email":
        if (!value.trim()) return "L'email è obbligatoria";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Email non valida";
        break;
    }
    return undefined;
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (clientSignature || signatureSession) {
      setClientSignature(null);
      setSignatureSession(null);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // Handle blur for validation
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateFields = (fields: Array<keyof typeof formData>): boolean => {
    const newErrors: FormErrors = {};

    for (const field of fields) {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    }

    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));

    return Object.keys(newErrors).length === 0;
  };

  // Validate all fields
  const validateAll = (): boolean => {
    if (aiFilledFields.length > 0 && !extractedDataConfirmed) {
      setExtractionMessage({
        type: "error",
        text: "Controlla i campi evidenziati e premi «Dati controllati» prima di continuare.",
      });
      return false;
    }

    return validateFields([
      "nome",
      "cognome",
      "dataNascita",
      "luogoNascita",
      "codiceFiscale",
      "telefono",
      "email",
      "sedeSelezionata",
      "numeroVestanet",
    ]);
  };

  // Handle form submission
  const handleSubmit = (
    mode: "pdf" | "autodichiarazione" | "all" | "simulate",
  ) => {
    // 🟢 Simula → فقط sede
    if (mode === "simulate") {
      if (!formData.sedeSelezionata) {
        setErrors((prev) => ({
          ...prev,
          sedeSelezionata: "La sede è obbligatoria",
        }));
        setTouched((prev) => ({
          ...prev,
          sedeSelezionata: true,
        }));
        return;
      }

      onSimulate(formData.sedeSelezionata);
      return;
    }

    if (mode === "autodichiarazione") {
      if (!validateFields(["nome", "cognome", "dataNascita", "codiceFiscale"])) {
        return;
      }

      onSubmitAutodichiarazione(buildSubmitData());
      return;
    }

    // 🟡 PDF + ALL → validate completo
    if (!validateAll()) return;

    const data = buildSubmitData();

    if (mode === "pdf") onSubmitPdfOnly(data, clientSignature || undefined);
    else {
      if (!sourceDocument) {
        setExtractionMessage({
          type: "error",
          text: "Carica o fotografa il documento prima di generare il fascicolo completo.",
        });
        return;
      }
      onSubmitAll(data, clientSignature || undefined, sourceDocument);
    }
  };

  // Input class helper
  const inputClass = (fieldName: string) => `
    w-full min-h-12 px-3.5 py-3 rounded-xl border transition-all duration-200
    ${aiFilledFields.includes(fieldName as ExtractableField) && !extractedDataConfirmed
      ? "bg-sky-500/10"
      : "bg-white/5"} backdrop-blur-sm
    text-white placeholder-slate-400
    ${
      errors[fieldName] && touched[fieldName]
        ? "border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
        : aiFilledFields.includes(fieldName as ExtractableField) && !extractedDataConfirmed
          ? "border-sky-400/70 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/20"
        : "border-slate-600/50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
    }
    outline-none
  `;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-800/65 backdrop-blur-sm rounded-2xl border border-slate-700/60 p-4 shadow-xl sm:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">
            Procura Francesca
          </h2>
          <p className="text-slate-400 text-sm">
            Inserisci i dati del cliente per generare la procura
          </p>
        </div>
        <button
          type="button"
          onClick={startNewPractice}
          className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
        >
          Nuova pratica
        </button>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-sky-100">Compila da documento</p>
              <p className="mt-1 text-xs text-slate-400">
                Opzionale · PDF, JPG, PNG o WEBP · massimo 10 MB
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-stretch">
              <label className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 ${isExtracting ? "pointer-events-none opacity-60" : ""}`}>
                {isExtracting ? "Analisi in corso..." : "Scegli documento"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleDocumentUpload}
                  disabled={isExtracting}
                  className="sr-only"
                />
              </label>
              {isMobileDevice ? (
                <label
                  className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 ${isExtracting ? "pointer-events-none opacity-60" : ""}`}
                >
                  {isExtracting ? "Analisi in corso..." : "Apri fotocamera"}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDocumentUpload}
                    disabled={isExtracting}
                    className="sr-only"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={createPhoneCaptureSession}
                  disabled={isCreatingCaptureSession || isExtracting}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {isCreatingCaptureSession ? "Creazione QR..." : "Scatta con telefono"}
                </button>
              )}
            </div>
          </div>
          {extractionMessage && (
            <p
              role="status"
              className={`mt-3 text-xs ${
                extractionMessage.type === "success" ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {extractionMessage.text}
            </p>
          )}
          {captureSession && (
            <div className="mt-4 rounded-xl border border-emerald-400/30 bg-slate-950/70 p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captureSession.qrCode}
                alt="QR per fotografare il documento"
                className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
              />
              <p className="mt-3 text-sm font-medium text-white">Scansiona con il telefono</p>
              <div
                role="status"
                className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5"
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                <p className="text-xs font-medium text-emerald-100">
                  Acquisizione in corso sul telefono. La foto apparirà qui automaticamente.
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-400">Il QR è valido una sola volta per 10 minuti.</p>
              {(captureSession.captureUrl.includes("localhost") ||
                captureSession.captureUrl.includes("127.0.0.1")) && (
                <p className="mt-2 text-xs text-amber-300">
                  Su localhost il telefono non può collegarsi: apri il sito tramite l'indirizzo di rete del computer o il sito pubblicato.
                </p>
              )}
              <button
                type="button"
                onClick={() => setCaptureSession(null)}
                className="mt-3 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Annulla
              </button>
            </div>
          )}
          {aiFilledFields.length > 0 && !extractedDataConfirmed && (
            <div className="mt-4 rounded-xl border border-sky-400/40 bg-sky-500/10 p-3">
              <p className="text-sm font-medium text-sky-100">
                Controlla i campi evidenziati in azzurro
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Confrontali con il documento prima di confermare.
              </p>
              <button
                type="button"
                onClick={() => {
                  setExtractedDataConfirmed(true);
                  setExtractionMessage({
                    type: "success",
                    text: "Dati estratti controllati e confermati.",
                  });
                }}
                className="mt-3 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
              >
                Dati controllati ✓
              </button>
            </div>
          )}
        </div>

        {documentPreview && (
          <section className="overflow-hidden rounded-xl border border-slate-600/60 bg-slate-900/60">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Documento caricato</p>
                <p className="truncate text-xs text-slate-400">{documentPreview.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {documentPreview.type !== "application/pdf" && (
                  <button
                    type="button"
                    onClick={handleDownloadImagePdf}
                    disabled={isConvertingImage}
                    className="rounded-md border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isConvertingImage ? "Conversione..." : "Scarica PDF"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDocumentPreview}
                  className="rounded-md border border-slate-600/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
                >
                  Nascondi
                </button>
              </div>
            </div>

            {documentPreview.type === "application/pdf" ? (
              <iframe
                src={documentPreview.url}
                title={`Anteprima ${documentPreview.name}`}
                className="h-[520px] w-full bg-white"
              />
            ) : (
              <div className="flex max-h-[560px] items-center justify-center overflow-auto bg-slate-950 p-3">
                {/* Blob URLs are local previews and do not need Next.js image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={documentPreview.url}
                  alt={`Anteprima ${documentPreview.name}`}
                  className="max-h-[530px] max-w-full rounded object-contain"
                />
              </div>
            )}
          </section>
        )}

        {/* Nome e Cognome */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-300">
                Nome <span className="text-red-400">*</span>
              </label>
              <CopyButton field="nome" value={formData.nome} />
            </div>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Mario"
              className={inputClass("nome")}
            />
            {errors.nome && touched.nome && (
              <p className="mt-1 text-xs text-red-400">{errors.nome}</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-300">
                Cognome <span className="text-red-400">*</span>
              </label>
              <CopyButton field="cognome" value={formData.cognome} />
            </div>
            <input
              type="text"
              name="cognome"
              value={formData.cognome}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Rossi"
              className={inputClass("cognome")}
            />
            {errors.cognome && touched.cognome && (
              <p className="mt-1 text-xs text-red-400">{errors.cognome}</p>
            )}
          </div>
        </div>

        {/* Data e Luogo di Nascita */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Data di nascita <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              name="dataNascita"
              value={formData.dataNascita}
              onChange={handleChange}
              onBlur={handleBlur}
              className={inputClass("dataNascita")}
            />
            {errors.dataNascita && touched.dataNascita && (
              <p className="mt-1 text-xs text-red-400">{errors.dataNascita}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Luogo di nascita <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="luogoNascita"
              value={formData.luogoNascita}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Roma"
              className={inputClass("luogoNascita")}
            />
            {errors.luogoNascita && touched.luogoNascita && (
              <p className="mt-1 text-xs text-red-400">{errors.luogoNascita}</p>
            )}
          </div>
        </div>

        {/* Codice Fiscale */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-300">
              Codice Fiscale <span className="text-red-400">*</span>
            </label>
            {formData.codiceFiscale.length === 16 && isCodiceFiscaleFormallyValid(formData.codiceFiscale) && (
              <span className="text-xs font-medium text-emerald-300">Formalmente valido ✓</span>
            )}
          </div>
          <input
            type="text"
            name="codiceFiscale"
            value={formData.codiceFiscale}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="RSSMRA85M01H501Z"
            maxLength={16}
            className={`${inputClass("codiceFiscale")} uppercase tracking-wider font-mono`}
          />
          {errors.codiceFiscale && touched.codiceFiscale && (
            <p className="mt-1 text-xs text-red-400">{errors.codiceFiscale}</p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
            <select
              value={fiscalCodeGender}
              onChange={(event) => setFiscalCodeGender(event.target.value as "" | "M" | "F")}
              aria-label="Sesso per il calcolo del codice fiscale"
              className="min-h-11 rounded-xl border border-slate-600/60 bg-slate-800 px-3 text-sm text-slate-200 outline-none focus:border-sky-400"
            >
              <option value="">Sesso per calcolo</option>
              <option value="M">Maschio</option>
              <option value="F">Femmina</option>
            </select>
            <button
              type="button"
              onClick={calculateFiscalCode}
              disabled={isCalculatingFiscalCode}
              className="min-h-11 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-60"
            >
              {isCalculatingFiscalCode ? "Calcolo in corso..." : "Calcola codice fiscale"}
            </button>
          </div>
          {fiscalCodeMessage && (
            <p className={`mt-2 text-xs ${fiscalCodeMessage.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
              {fiscalCodeMessage.text}
            </p>
          )}
        </div>
        {/* Telefono */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-300">
              Telefono <span className="text-red-400">*</span>
            </label>
            <CopyButton field="telefono" value={formData.telefono} />
          </div>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="+39 3331234567"
            className={inputClass("telefono")}
          />
          {errors.telefono && touched.telefono && (
            <p className="mt-1 text-xs text-red-400">{errors.telefono}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="cliente@email.com"
            className={inputClass("email")}
          />
          {errors.email && touched.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Numero Vestanet */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-300">
              Numero VESTANET <span className="text-red-400">*</span>
            </label>
            <CopyButton field="numero Vestanet" value={formData.numeroVestanet.toUpperCase()} />
          </div>
          <input
            type="text"
            name="numeroVestanet"
            value={formData.numeroVestanet.toUpperCase()}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="123456"
            className={`${inputClass("numeroVestanet")} font-mono`}
          />
          {errors.numeroVestanet && touched.numeroVestanet && (
            <p className="mt-1 text-xs text-red-400">{errors.numeroVestanet}</p>
          )}
        </div>

        {/* Sede Selezionata */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Provincia di competenza <span className="text-red-400">*</span>
          </label>
          <select
            name="sedeSelezionata"
            value={formData.sedeSelezionata}
            onChange={handleChange}
            onBlur={handleBlur}
            className={inputClass("sedeSelezionata")}
          >
            <option value="">Seleziona una provincia...</option>
            {Object.entries(sediPerRegione).map(([region, sedi]) => (
              <optgroup key={region} label={region}>
                {sedi.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.sedeSelezionata && touched.sedeSelezionata && (
            <p className="mt-1 text-xs text-red-400">
              {errors.sedeSelezionata}
            </p>
          )}
        </div>

        {/* Tipo Richiesta */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tipo di richiesta <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${
                  formData.tipoRichiesta === "asilo"
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-slate-600/50 bg-white/5 hover:border-slate-500/50"
                }
              `}
            >
              <input
                type="radio"
                name="tipoRichiesta"
                value="asilo"
                checked={formData.tipoRichiesta === "asilo"}
                onChange={handleChange}
                className="sr-only"
              />
              <div
                className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${
                  formData.tipoRichiesta === "asilo"
                    ? "border-amber-400"
                    : "border-slate-500"
                }
              `}
              >
                {formData.tipoRichiesta === "asilo" && (
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </div>
              <span className="text-sm text-white">
                Protezione internazionale
              </span>
            </label>
            <label
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${
                  formData.tipoRichiesta === "accesso"
                    ? "border-amber-400/50 bg-amber-400/10"
                    : "border-slate-600/50 bg-white/5 hover:border-slate-500/50"
                }
              `}
            >
              <input
                type="radio"
                name="tipoRichiesta"
                value="accesso"
                checked={formData.tipoRichiesta === "accesso"}
                onChange={handleChange}
                className="sr-only"
              />
              <div
                className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${
                  formData.tipoRichiesta === "accesso"
                    ? "border-amber-400"
                    : "border-slate-500"
                }
              `}
              >
                {formData.tipoRichiesta === "accesso" && (
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </div>
              <span className="text-sm text-white">Accesso agli atti</span>
            </label>
          </div>
        </div>

        <section className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-violet-100">Firma del cliente</p>
              <p className="mt-1 text-xs text-slate-400">
                Compila tutti i campi, poi fai firmare la Procura dal telefono.
              </p>
            </div>
            <button
              type="button"
              onClick={createClientSignatureSession}
              disabled={isCreatingSignatureSession}
              className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-60"
            >
              {isCreatingSignatureSession
                ? "Creazione QR..."
                : clientSignature
                  ? "Rifai firma"
                  : "Firma con telefono"}
            </button>
          </div>

          {signatureSession && (
            <div className="mt-4 rounded-xl border border-violet-400/30 bg-slate-950/70 p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureSession.qrCode}
                alt="QR per firmare la Procura"
                className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
              />
              <p className="mt-3 text-sm font-medium text-white">Scansiona per firmare</p>
              <div
                role="status"
                className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2.5"
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-400" />
                <p className="text-xs font-medium text-violet-100">
                  Firma in corso sul telefono. Apparirà qui automaticamente.
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-400">Link monouso · valido per 10 minuti</p>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-2 text-left">
                <p className="break-all text-[11px] text-slate-400">
                  {signatureSession.captureUrl}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copySignatureLink}
                  className="rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/20"
                >
                  {signatureLinkCopied ? "Copiato ✓" : "Copia link"}
                </button>
                <button
                  type="button"
                  onClick={shareSignatureLinkOnWhatsApp}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                >
                  Invia con WhatsApp
                </button>
              </div>
              {(signatureSession.captureUrl.includes("localhost") ||
                signatureSession.captureUrl.includes("127.0.0.1")) && (
                <p className="mt-2 text-xs text-amber-300">
                  Apri il sito sul computer tramite il suo indirizzo di rete prima di creare il QR.
                </p>
              )}
              <button
                type="button"
                onClick={() => setSignatureSession(null)}
                className="mt-3 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Annulla
              </button>
            </div>
          )}

          {clientSignature && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clientSignature}
                  alt="Firma del cliente"
                  className="h-20 min-w-0 flex-1 rounded-lg bg-white object-contain p-2"
                />
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-emerald-200">Firma ricevuta ✓</p>
                  <button
                    type="button"
                    onClick={() => setClientSignature(null)}
                    className="mt-2 text-xs text-red-300 hover:text-red-200"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Se modifichi i dati del modulo, la firma verrà rimossa automaticamente.
              </p>
            </div>
          )}
        </section>

        {/* Submit Buttons */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          onClick={() => handleSubmit("simulate")}
          className="
    w-full py-3 px-4 rounded-lg font-medium transition-all
    border border-blue-500/40 hover:border-blue-400
    text-blue-300 hover:text-white
    bg-blue-500/10 hover:bg-blue-500/20
  "
        >
          PEC
        </motion.button>
        <div className="sticky bottom-3 z-20 -mx-2 space-y-2 rounded-xl border border-slate-600/70 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={() => handleSubmit("all")}
            disabled={isLoading}
            className={`
              w-full py-3.5 px-4 rounded-lg font-medium transition-all
              bg-gradient-to-r from-amber-500 to-amber-600
              hover:from-amber-400 hover:to-amber-500
              text-slate-900 shadow-lg shadow-amber-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? "Generazione in corso..." : "Genera tutto"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={() => handleSubmit("pdf")}
            disabled={isLoading}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all
              border border-slate-600 hover:border-slate-500
              text-slate-300 hover:text-white
              bg-white/5 hover:bg-white/10
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Stampa Procura PDF
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={() => handleSubmit("autodichiarazione")}
            disabled={isLoading}
            className={`
              w-full py-3 px-4 rounded-lg font-medium transition-all
              border border-sky-500/40 hover:border-sky-400
              text-sky-300 hover:text-white
              bg-sky-500/10 hover:bg-sky-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Stampa Autodichiarazione PDF
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

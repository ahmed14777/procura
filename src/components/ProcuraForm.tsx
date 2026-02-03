"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getSediOrdinatePerRegione,
  type SedeSelezionabile,
} from "@/data/commissioni";
import type { ProcuraFormData, TipoRichiesta } from "@/lib/schema";

interface ProcuraFormProps {
  onSubmitPdfOnly: (data: ProcuraFormData) => void;
  onSubmitAll: (data: ProcuraFormData) => void;
  isLoading: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
}

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
  onSubmitAll,
  isLoading,
}: ProcuraFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    dataNascita: "",
    luogoNascita: "",
    codiceFiscale: "",
    numeroVestanet: "",
    sedeSelezionata: "",
    tipoRichiesta: "asilo" as TipoRichiesta,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

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
      case "dataNascita":
        if (!value) return "La data di nascita è obbligatoria";
        const date = new Date(value);
        if (date >= new Date()) return "La data deve essere nel passato";
        break;
      case "luogoNascita":
        if (!value.trim()) return "Il luogo di nascita è obbligatorio";
        break;
      case "codiceFiscale":
        if (!value.trim()) return "Il codice fiscale è obbligatorio";
        if (value.length !== 16)
          return "Il codice fiscale deve essere di 16 caratteri";
        if (!/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(value)) {
          return "Il codice fiscale non è valido";
        }
        break;
      case "sedeSelezionata":
        if (!value) return "La sede è obbligatoria";
        break;
      case "numeroVestanet":
        if (value && !/^[A-Z]{2}[0-9]+$/.test(value))
          return "Deve iniziare con due lettere seguite solo da numeri (es. AB12345)";
        break;
    }
    return undefined;
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
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

  // Validate all fields
  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};
    const fields = [
      "nome",
      "cognome",
      "dataNascita",
      "luogoNascita",
      "codiceFiscale",
      "sedeSelezionata",
      "numeroVestanet",
    ];

    for (const field of fields) {
      const error = validateField(
        field,
        formData[field as keyof typeof formData],
      );
      if (error) newErrors[field] = error;
    }

    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (mode: "pdf" | "all") => {
    if (!validateAll()) return;

    const data: ProcuraFormData = {
      ...formData,
      codiceFiscale: formData.codiceFiscale.toUpperCase(),
    };

    if (mode === "pdf") {
      onSubmitPdfOnly(data);
    } else {
      onSubmitAll(data);
    }
  };

  // Input class helper
  const inputClass = (fieldName: string) => `
    w-full px-4 py-3 rounded-lg border transition-all duration-200
    bg-white/5 backdrop-blur-sm
    text-white placeholder-slate-400
    ${
      errors[fieldName] && touched[fieldName]
        ? "border-red-400/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
        : "border-slate-600/50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
    }
    outline-none
  `;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">
          Procura Francesca
        </h2>
        <p className="text-slate-400 text-sm">
          Inserisci i dati del cliente per generare la procura
        </p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        {/* Nome e Cognome */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Cognome <span className="text-red-400">*</span>
            </label>
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
        <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Codice Fiscale <span className="text-red-400">*</span>
          </label>
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
        </div>

        {/* Numero Vestanet */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Numero VESTANET <span className="text-slate-500">(opzionale)</span>
          </label>
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

        {/* Submit Buttons */}
        <div className="pt-4 space-y-3">
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
            Scarica solo procura PDF
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

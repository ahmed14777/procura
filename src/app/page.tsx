"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProcuraForm } from "@/components/ProcuraForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import { resolvePec, type PecResolutionResult } from "@/lib/pecResolver";
import { generateEmail, type GeneratedEmail } from "@/lib/emailGenerator";
import { downloadProcuraPdf } from "@/lib/pdfGenerator";
import type { ProcuraFormData } from "@/lib/schema";

/**
 * Main Page Component - Procura Francesca
 *
 * Single screen layout with form on left and results on right.
 * Supports two modes:
 * - "Scarica solo procura PDF": Download PDF only
 * - "Genera tutto": Generate PDF + resolve PEC + generate email
 */
export default function Home() {
  // State for results
  const [pecResult, setPecResult] = useState<PecResolutionResult | null>(null);
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [currentFormData, setCurrentFormData] =
    useState<ProcuraFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle "Scarica solo procura PDF" action
   * Only generates and downloads the PDF
   */
  const handlePdfOnly = useCallback(async (data: ProcuraFormData) => {
    setIsLoading(true);
    setError(null);

    // Clear previous results when using PDF only mode
    setPecResult(null);
    setEmail(null);

    try {
      await downloadProcuraPdf(data);
      setCurrentFormData(data);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Errore durante la generazione del PDF. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle "Genera tutto" action
   * Generates PDF + resolves PEC + generates email
   */
  const handleGenerateAll = useCallback(async (data: ProcuraFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Resolve PEC
      const pecResolution = resolvePec(data.sedeSelezionata);

      if (!pecResolution.success) {
        setError(pecResolution.error);
        setPecResult(null);
        setEmail(null);
        return;
      }

      setPecResult(pecResolution);

      // 2. Generate email
      const generatedEmail = generateEmail(data, pecResolution.commissione);
      setEmail(generatedEmail);

      // 3. Generate and download PDF
      await downloadProcuraPdf(data);

      setCurrentFormData(data);
    } catch (err) {
      console.error("Generation error:", err);
      setError("Errore durante la generazione. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle manual PDF download from results panel
   */
  const handleDownloadPdf = useCallback(async () => {
    if (!currentFormData) return;

    setIsDownloading(true);
    try {
      await downloadProcuraPdf(currentFormData);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [currentFormData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid lg:grid-cols-2 gap-6 h-full"
        >
          {/* Left Side - Form */}
          <div>
            <ProcuraForm
              onSubmitPdfOnly={handlePdfOnly}
              onSubmitAll={handleGenerateAll}
              isLoading={isLoading}
            />

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Side - Results */}
          <div>
            <ResultsPanel
              pecResult={pecResult}
              email={email}
              onDownloadPdf={handleDownloadPdf}
              isDownloading={isDownloading}
            />
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

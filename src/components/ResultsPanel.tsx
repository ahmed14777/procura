'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PecResolutionResult } from '@/lib/pecResolver';
import type { GeneratedEmail } from '@/lib/emailGenerator';

interface ResultsPanelProps {
  pecResult: PecResolutionResult | null;
  email: GeneratedEmail | null;
  onDownloadPdf: () => void;
  isDownloading: boolean;
}

/**
 * ResultsPanel Component
 * 
 * Displays the resolved PEC information and generated email.
 * Provides copy functionality for subject and email body.
 */
export function ResultsPanel({ 
  pecResult, 
  email, 
  onDownloadPdf, 
  isDownloading 
}: ResultsPanelProps) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, type: 'subject' | 'body') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Empty state
  if (!pecResult && !email) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30 p-8 h-full flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">
            Compila il form e clicca "Genera tutto" per visualizzare i risultati
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="results"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.5 }}
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Risultati</h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isDownloading ? 'Download...' : 'Scarica procura PDF'}
          </motion.button>
        </div>

        {/* PEC Section */}
        {pecResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Destinatario PEC
            </h3>
            
            {/* PEC Address */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Indirizzo PEC</span>
              </div>
              <p className="text-amber-400 font-mono text-sm break-all">
                {pecResult.pec}
              </p>
            </div>

            {/* Commission */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <span className="text-xs text-slate-500">Commissione competente</span>
              <p className="text-white mt-1">
                Commissione Territoriale di {pecResult.commissione}
              </p>
            </div>

            {/* Reason */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-300 text-sm">
                  {pecResult.motivoSelezione}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Email Section */}
        {email && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Email PEC
            </h3>

            {/* Subject */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Oggetto</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(email.subject, 'subject')}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all
                    ${copiedSubject 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                >
                  {copiedSubject ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiato
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copia oggetto
                    </>
                  )}
                </motion.button>
              </div>
              <p className="text-white text-sm">
                {email.subject}
              </p>
            </div>

            {/* Body */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Testo email</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(email.body, 'body')}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all
                    ${copiedBody 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                >
                  {copiedBody ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiato
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copia email
                    </>
                  )}
                </motion.button>
              </div>
              <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                {email.body}
              </pre>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

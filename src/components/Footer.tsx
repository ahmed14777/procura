'use client';

import { motion } from 'framer-motion';

/**
 * Footer Component
 * 
 * Simple, subtle footer showing the creator credit
 */
export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="py-4 text-center"
    >
      <p className="text-xs text-slate-500 tracking-wide">
        Designed & built by{' '}
        <span className="text-slate-400 font-medium">Ayado</span>
      </p>
    </motion.footer>
  );
}

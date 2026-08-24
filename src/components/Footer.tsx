'use client'

import { motion } from 'framer-motion'

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
      <p className="text-xs tracking-wide text-[#4f6b8b]">
        Designed & built by <span className="font-medium text-[#1f3b63]">Ahmed Ayad</span>
      </p>
    </motion.footer>
  )
}

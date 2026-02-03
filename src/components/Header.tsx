'use client';

import { motion } from 'framer-motion';

/**
 * Header Component
 * 
 * Animated professional header displaying the collaboration
 * between Easy2Do and Avv. Francesca Guicciardini
 */
export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50"
    >
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-center gap-4">
          {/* Easy2Do brand */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center"
          >
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-white">Easy</span>
              <span className="text-amber-400">2</span>
              <span className="text-white">Do</span>
            </span>
          </motion.div>

          {/* Animated connector */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex items-center"
          >
            <motion.span
              animate={{ 
                color: ['#fbbf24', '#f59e0b', '#fbbf24'],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
              className="text-2xl font-light px-2"
            >
              ×
            </motion.span>
          </motion.div>

          {/* Avvocato brand */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center"
          >
            <span className="text-xl font-serif text-white tracking-wide">
              Avv. Francesca Guicciardini
            </span>
          </motion.div>
        </div>

        {/* Subtle glowing line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
        />
      </div>
    </motion.header>
  );
}

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/lib/osContext';

const LETTERS = ['K', 'u', 'd', 'd', 'O', 'S'];

export default function BootScreen() {
  const { dispatch } = useOS();
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setExiting(true), 2200);
    const t4 = setTimeout(() => dispatch({ type: 'SET_BOOTED', payload: true }), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [dispatch]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#000814' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle radial glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.05) 0%, transparent 60%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* Logo letters */}
          <div className="flex items-center gap-1 mb-8">
            {LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                className="text-white font-light text-glow"
                style={{ fontSize: 72, letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Progress bar */}
          <motion.div
            className="relative overflow-hidden"
            style={{ width: 120, height: 2, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{ background: '#00E5FF', borderRadius: 1 }}
              initial={{ width: '0%' }}
              animate={phase >= 2 ? { width: '100%' } : { width: '0%' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>

          {/* Subtle version text */}
          <motion.p
            className="mt-4 text-xs"
            style={{ color: 'rgba(255, 255, 255, 0.25)', letterSpacing: '0.08em' }}
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            v1.0
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * AppexQuant Markets Global - Phase 3 Cinematic Ambient Background
 * Provides subtle ambient background motion with GPU optimization & reduced motion support.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { isReducedMotionPreferred } from '../../design/motion';

export const AmbientBackground: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(isReducedMotionPreferred());
  }, []);

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#020617] via-[#080e22] to-[#020617] opacity-90" />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Deep Space Canvas Base */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Slow Flowing Ambient Energy Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 25, 0],
          y: [0, -20, 0],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -30, 0],
          y: [0, 25, 0],
          opacity: [0.08, 0.18, 0.08],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-blue-600/20 blur-3xl"
      />

      <motion.div
        animate={{
          opacity: [0.04, 0.1, 0.04],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-[120px]"
      />

      {/* Subtle Quant Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};

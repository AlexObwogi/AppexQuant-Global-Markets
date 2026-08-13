/**
 * AppexQuant Markets Global - Phase 3 Motion Tokens
 * Standardized Framer Motion / Motion library animation presets for consistency.
 */

export const motionTokens = {
  fast: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] },
  normal: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] },
  slow: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] },
  spring: { type: 'spring', stiffness: 320, damping: 28 },
  ambient: { duration: 16, repeat: Infinity, ease: 'linear' },
  
  variants: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -12 },
    },
    scaleUp: {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.96 },
    },
    staggerContainer: {
      animate: {
        transition: {
          staggerChildren: 0.06,
        },
      },
    },
  },
};

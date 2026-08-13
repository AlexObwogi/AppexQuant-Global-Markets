/**
 * AppexQuant Markets Global - Centralized Motion System
 */

export const motionTokens = {
  fast: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  normal: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  slow: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  spring: { type: 'spring' as const, stiffness: 350, damping: 25 },
  ambient: { duration: 8, ease: 'easeInOut' as const, repeat: Infinity, repeatType: 'reverse' as const },
};

export const pageTransitionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: motionTokens.normal },
  exit: { opacity: 0, y: -4, transition: motionTokens.fast },
};

export const cardHoverVariants = {
  rest: { scale: 1, translateY: 0 },
  hover: { scale: 1.01, translateY: -2, transition: motionTokens.fast },
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: motionTokens.normal },
  exit: { opacity: 0, scale: 0.96, y: 10, transition: motionTokens.fast },
};

export const staggeredContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const staggeredItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: motionTokens.normal },
};

export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


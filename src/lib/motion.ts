import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

/** One source of truth for timing. No inline durations anywhere else. */
export const D = {
  instant: 0.08,
  fast: 0.16,
  base: 0.22,
  slow: 0.4,
  reveal: 0.65,
} as const;

type Cubic = [number, number, number, number];

export const E = {
  out: [0.16, 1, 0.3, 1] as Cubic, // decelerate — entrances
  inOut: [0.65, 0, 0.35, 1] as Cubic, // transitions
  spring: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as Transition,
};

export const press = {
  whileTap: { scale: 0.97 },
  transition: { duration: D.instant },
} as const;

// ---- shared variants -------------------------------------------------------

/** Screen transition direction, passed through AnimatePresence `custom`. */
export type NavMode = 'forward' | 'back' | 'fade';

export const screenVariants: Variants = {
  initial: (m: NavMode) =>
    m === 'fade' ? { opacity: 0 } : { opacity: 0, x: m === 'back' ? -24 : 24 },
  animate: { opacity: 1, x: 0, transition: { duration: D.base, ease: E.out } },
  exit: (m: NavMode) =>
    m === 'fade'
      ? { opacity: 0, transition: { duration: D.fast } }
      : { opacity: 0, x: m === 'back' ? 16 : -16, transition: { duration: D.fast, ease: E.inOut } },
};

/** Stagger container. Children using `riseItem` inherit the cadence. */
export function staggerContainer(staggerChildren = 0.04, delayChildren = 0): Variants {
  return {
    initial: {},
    animate: { transition: { staggerChildren, delayChildren } },
  };
}

export const riseItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: D.base, ease: E.out } },
};

/**
 * The pending-result pulse lives in CSS (`.pulse-dot` in tokens.css), not
 * here. It is the one indefinite loop in the app, and a compositor-driven
 * keyframe costs nothing where a JS raf loop would run for the whole session.
 */

export const shake: TargetAndTransition = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: D.base, ease: E.inOut },
};

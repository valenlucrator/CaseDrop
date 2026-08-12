import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { D, E } from '../../lib/motion';

interface Props {
  to: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  /** Rendered before the count starts — the reveal holds on this. */
  placeholder?: string;
  start?: boolean;
  className?: string;
}

/**
 * An actual tick from zero, not a fade-in of the final number. The difference
 * is the whole reason the reveal reads as an event rather than a label.
 */
export function CountUp({
  to,
  duration = D.reveal,
  delay = 0,
  suffix = '',
  placeholder,
  start = true,
  className = '',
}: Props) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!start) return;
    if (reduced) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { duration, delay, ease: E.out });
    return () => controls.stop();
  }, [to, start, duration, delay, reduced, mv]);

  if (!start && placeholder !== undefined) {
    return <span className={className}>{placeholder}</span>;
  }

  return <motion.span className={className}>{text}</motion.span>;
}

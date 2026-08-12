import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { D, E } from '../lib/motion';
import { haptic } from '../lib/haptics';

type Variant = 'primary' | 'secondary';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
  /** Set null where the caller fires its own (the LOCK sequence does). */
  feedback?: 'tap' | 'lock' | null;
}

/**
 * The one-accent rule: white fill is the primary action on every screen, no
 * exceptions. Blue is reserved for the player's own data. Disabled is a
 * filled surface with a visible border, so it reads as "not yet" rather
 * than "broken".
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  feedback = 'tap',
}: Props) {
  const base =
    'flex h-14 w-full items-center justify-center rounded-[13px] font-display text-[13px] font-bold tracking-[0.14em]';

  const look = disabled
    ? 'bg-surface-2 text-text-faint border border-border-strong'
    : variant === 'primary'
      ? 'bg-action text-surface-0 active:bg-action-press'
      : 'bg-surface-1 text-text-primary border border-border-strong active:bg-surface-3';

  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: D.instant, ease: E.out }}
      onClick={() => {
        if (disabled) return;
        if (feedback) haptic(feedback);
        onClick?.();
      }}
      className={`${base} ${look} ${className}`}
    >
      {children}
    </motion.button>
  );
}

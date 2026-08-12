import { motion } from 'framer-motion';
import type { ComponentProps, ReactNode } from 'react';
import { D, E } from '../../lib/motion';
import { haptic } from '../../lib/haptics';

type Props = Omit<ComponentProps<typeof motion.button>, 'onTap'> & {
  children: ReactNode;
  /** Haptic fired on press. Silent on iOS by design — see lib/haptics.ts. */
  feedback?: 'tap' | 'select' | 'lock' | null;
  /** 60ms background tint flash. On iOS this is the entire tactile channel. */
  flash?: boolean;
};

/**
 * Every interactive element in the app goes through here. The press response
 * is not decoration: on iPhone there is no vibration API, so scale + tint is
 * the only acknowledgement the player gets that a tap registered.
 */
export function Pressable({
  children,
  feedback = 'tap',
  flash = true,
  onClick,
  disabled,
  className = '',
  ...rest
}: Props) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: D.instant, ease: E.out }}
      onClick={(e) => {
        if (disabled) return;
        if (feedback) haptic(feedback);
        onClick?.(e);
      }}
      className={`${flash && !disabled ? 'transition-colors duration-[60ms] active:bg-white/4' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

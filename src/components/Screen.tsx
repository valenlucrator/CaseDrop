import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { riseItem, staggerContainer } from '../lib/motion';

/**
 * Shared screen scaffold. Top padding clears the status bar; the scroll
 * container is the flex child so the tab bar never scrolls away.
 *
 * The hairline is the single texture choice in the design: it fades in once
 * the content has moved past 8px, so a scrolled screen reads as scrolled.
 */
export function Screen({
  children,
  className = '',
  pad = 'pb-3',
}: {
  children: ReactNode;
  className?: string;
  pad?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <div
      onScroll={(e) => {
        const past = e.currentTarget.scrollTop > 8;
        if (past !== scrolled) setScrolled(past);
      }}
      className={`flex flex-1 flex-col overflow-y-auto px-[22px] pt-[62px] ${pad} ${className}`}
    >
      <div
        aria-hidden
        className="sticky top-0 z-10 -mx-[22px] h-px shrink-0 bg-[--color-border] transition-opacity duration-200"
        style={{ opacity: scrolled ? 1 : 0 }}
      />
      {children}
    </div>
  );
}

export function Spacer() {
  return <div className="flex-1" />;
}

/**
 * Pinned footer for the play flow. The gradient strip above it matters:
 * without it, long scenario text is sliced mid-line by the button edge and
 * reads as a rendering fault rather than as more text below.
 */
export function StickyFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sticky bottom-0 -mx-[22px] mt-auto px-[22px] ${className}`}>
      <div className="pointer-events-none h-10 bg-gradient-to-b from-transparent to-surface-0" />
      <div className="bg-surface-0 pb-9">{children}</div>
    </div>
  );
}

export function MetaLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`meta text-text-muted ${className}`}>{children}</div>;
}

export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={`font-display text-[30px] leading-none font-extrabold tracking-[-0.025em] uppercase ${className}`}
    >
      {children}
    </h1>
  );
}

// ---- stagger helpers -------------------------------------------------------

export function Stagger({
  children,
  gap = 0.04,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  gap?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer(gap, delay)}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Rise({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={riseItem} className={className}>
      {children}
    </motion.div>
  );
}

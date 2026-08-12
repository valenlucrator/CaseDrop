import type { ReactNode } from 'react';

/**
 * Shared screen scaffold. Top padding clears the status bar; the scroll
 * container is the flex child so the tab bar never scrolls away.
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
  return (
    <div className={`flex flex-1 flex-col overflow-y-auto px-[22px] pt-[62px] ${pad} ${className}`}>
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

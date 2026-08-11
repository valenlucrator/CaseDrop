import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
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
}: Props) {
  const base =
    'flex h-14 w-full items-center justify-center rounded-[13px] font-display text-[13px] font-bold tracking-[0.14em] transition-[background-color,transform] duration-100 active:scale-[0.985] disabled:active:scale-100';

  const look = disabled
    ? 'bg-surface-2 text-text-faint border border-border-strong'
    : variant === 'primary'
      ? 'bg-action text-surface-0 active:bg-action-press'
      : 'bg-surface-1 text-text-primary border border-border-strong active:bg-surface-3';

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${look} ${className}`}>
      {children}
    </button>
  );
}

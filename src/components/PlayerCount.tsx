import { formatCount, isEarly } from '../engine/population';

interface Props {
  count: number;
  /** e.g. "decisions", "jurors voted", "players today" */
  noun: string;
  className?: string;
}

/**
 * Below the population threshold this renders "You're early" instead of a
 * number. Designed in now rather than retrofitted — shipping "3 jurors
 * voted" announces that the app is empty.
 */
export function PlayerCount({ count, noun, className = '' }: Props) {
  const base = `font-mono text-[12.5px] leading-none ${className}`;
  if (isEarly(count)) {
    return <div className={`${base} text-text-muted`}>You're early</div>;
  }
  return (
    <div className={`${base} text-text-muted`}>
      {formatCount(count)} {noun}
    </div>
  );
}

/** Stat-block variant: big value over a caption, as on Home. */
export function PlayerCountStat({ count, noun }: Props) {
  const early = isEarly(count);
  return (
    <div className="flex flex-col gap-[5px] pt-3.5">
      <div className="font-mono text-[17px] leading-none">{early ? '—' : formatCount(count)}</div>
      <div className="text-[11.5px] leading-none text-text-muted">{early ? "you're early" : noun}</div>
    </div>
  );
}

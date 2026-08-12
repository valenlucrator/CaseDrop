import { useEffect, useState } from 'react';

interface Props {
  label: string;
  percent: number;
  /** Blue marks the player's own position; grey is everyone else. */
  mine?: boolean;
  tone?: 'accent' | 'win' | 'neutral';
  size?: 'md' | 'sm';
  animate?: boolean;
}

const FILL = {
  accent: 'bg-accent',
  win: 'bg-win',
  neutral: 'bg-[#454b52]',
} as const;

const TEXT = {
  accent: 'text-accent',
  win: 'text-win',
  neutral: 'text-text-secondary',
} as const;

export function SplitBar({ label, percent, mine = false, tone, size = 'md', animate = true }: Props) {
  const resolved = tone ?? (mine ? 'accent' : 'neutral');
  const [width, setWidth] = useState(animate ? 0 : percent);

  useEffect(() => {
    if (!animate) return setWidth(percent);
    const id = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(id);
  }, [percent, animate]);

  return (
    <div className="flex flex-col gap-[11px]">
      <div className="flex items-baseline justify-between">
        <div
          className={`font-display text-[16px] font-semibold uppercase tracking-[0.02em] ${
            mine ? 'text-text-primary' : 'text-text-secondary'
          }`}
        >
          {label}
        </div>
        <div
          className={`font-mono font-semibold ${TEXT[resolved]} ${
            size === 'md' ? 'text-[30px]' : 'text-[22px]'
          } leading-none`}
        >
          {percent}%
        </div>
      </div>
      <div className={`overflow-hidden rounded-[3px] bg-surface-2 ${size === 'md' ? 'h-1.5' : 'h-[5px]'}`}>
        <div
          className={`h-full rounded-[3px] transition-[width] duration-700 ease-out ${FILL[resolved]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

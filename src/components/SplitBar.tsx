import { motion } from 'framer-motion';
import { D, E } from '../lib/motion';
import { CountUp } from './motion/CountUp';

interface Props {
  label: string;
  percent: number;
  /** Blue marks the player's own position; grey is everyone else. */
  mine?: boolean;
  tone?: 'accent' | 'win' | 'neutral';
  size?: 'md' | 'sm';
  /** Gate the fill + count. Held false while the reveal waits its beat. */
  start?: boolean;
  duration?: number;
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

export function SplitBar({
  label,
  percent,
  mine = false,
  tone,
  size = 'md',
  start = true,
  duration = D.reveal,
}: Props) {
  const resolved = tone ?? (mine ? 'accent' : 'neutral');

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
        <CountUp
          to={percent}
          start={start}
          placeholder="—"
          suffix="%"
          duration={duration}
          className={`font-mono font-semibold tabular-nums ${TEXT[resolved]} ${
            size === 'md' ? 'text-[30px]' : 'text-[22px]'
          } leading-none`}
        />
      </div>
      <div className={`overflow-hidden rounded-[3px] bg-surface-2 ${size === 'md' ? 'h-1.5' : 'h-[5px]'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: start ? `${percent}%` : 0 }}
          transition={{ duration, ease: E.out }}
          className={`h-full rounded-[3px] ${FILL[resolved]}`}
        />
      </div>
    </div>
  );
}

interface Props {
  label: string;
  text: string;
  attribution?: string;
  percent?: number;
  tone?: 'neutral' | 'win' | 'muted';
  children?: React.ReactNode;
  dimmed?: boolean;
}

const BORDER = {
  neutral: 'border-border',
  win: 'border-win/30',
  muted: 'border-border',
} as const;

const LABEL = {
  neutral: 'text-text-muted',
  win: 'text-win',
  muted: 'text-text-muted',
} as const;

export function ArgumentCard({
  label,
  text,
  attribution,
  percent,
  tone = 'neutral',
  children,
  dimmed = false,
}: Props) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-[16px] border bg-surface-1 p-5 transition-opacity ${BORDER[tone]} ${
        dimmed ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`meta ${LABEL[tone]}`}>{label}</div>

        {percent !== undefined ? (
          <div className={`font-mono text-[13px] font-semibold ${tone === 'win' ? 'text-win' : 'text-text-muted'}`}>
            {percent}%
          </div>
        ) : (
          attribution && <div className="font-mono text-[11px] text-text-faint">{attribution}</div>
        )}
      </div>

      <div
        className={`text-[15.5px] leading-[1.5] text-pretty ${
          tone === 'muted' ? 'text-text-secondary' : 'text-text-body'
        }`}
      >
        {text}
      </div>

      {children}
    </div>
  );
}

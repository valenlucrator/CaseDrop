import { useState } from 'react';
import type { EvidenceItem } from '../types/case';

interface Props {
  items: EvidenceItem[];
  /** Tapping a chip re-opens the item. Three minutes is short, but not short
   *  enough to hold a scenario in working memory while committing to it. */
  expandable?: boolean;
}

export function EvidenceChips({ items, expandable = true }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const active = items.find((i) => i.id === open);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-[7px]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={expandable ? () => setOpen(open === item.id ? null : item.id) : undefined}
            className={`rounded-[7px] border px-2.5 py-1.5 font-mono text-[10px] leading-none tracking-[0.1em] uppercase transition-colors ${
              open === item.id
                ? 'border-accent text-text-primary'
                : 'border-border-strong text-text-secondary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="rounded-[12px] border border-border bg-surface-1 p-4 text-[13.5px] leading-[1.5] whitespace-pre-line text-text-body">
          {active.body}
        </div>
      )}
    </div>
  );
}

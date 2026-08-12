import { useState } from 'react';
import type { EvidenceItem } from '../types/case';
import { Pressable } from './motion/Pressable';
import { Sheet } from './motion/Sheet';

interface Props {
  items: EvidenceItem[];
}

/**
 * Tapping a chip opens the item in a peek sheet. Three minutes is short, but
 * not short enough to hold a scenario in working memory while committing to
 * it irreversibly — and re-reading must never cost the player their place.
 */
export function EvidenceChips({ items }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const active = items.find((i) => i.id === open);

  return (
    <>
      <div className="flex flex-wrap gap-[7px]">
        {items.map((item) => (
          <Pressable
            key={item.id}
            onClick={() => setOpen(item.id)}
            className="rounded-[7px] border border-border-strong px-2.5 py-1.5 font-mono text-[10px] leading-none tracking-[0.1em] text-text-secondary uppercase"
          >
            {item.label}
          </Pressable>
        ))}
      </div>

      <Sheet open={active !== undefined} onClose={() => setOpen(null)} title={active?.label}>
        <div className="text-[15px] leading-[1.55] whitespace-pre-line text-text-body">
          {active?.body}
        </div>
      </Sheet>
    </>
  );
}

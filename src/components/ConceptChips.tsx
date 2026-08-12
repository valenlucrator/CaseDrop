import { useState } from 'react';
import { getEntry } from '../data/learn';
import { Pressable } from './motion/Pressable';
import { Sheet } from './motion/Sheet';
import { MetaLabel } from './Screen';

/**
 * Concepts a case turns on, tappable mid-case. The sheet overlays rather
 * than navigates, so dismissing it returns the reader to exactly the scroll
 * position they were at — leaving a case to look something up is how a
 * three-minute session becomes an abandoned one.
 */
export function ConceptChips({ concepts }: { concepts: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const entry = open ? getEntry(open) : undefined;
  const available = concepts.map(getEntry).filter((e) => e !== undefined);

  if (!available.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-[7px]">
        {available.map((e) => (
          <Pressable
            key={e.id}
            onClick={() => setOpen(e.id)}
            className="rounded-[7px] border border-dashed border-border-strong px-2.5 py-1.5 text-[11.5px] leading-none text-text-secondary"
          >
            {e.term}
          </Pressable>
        ))}
      </div>

      <Sheet open={entry !== undefined} onClose={() => setOpen(null)} title={entry?.category}>
        {entry && (
          <div className="flex flex-col gap-4">
            <div className="font-display text-[24px] leading-none font-bold tracking-[-0.02em]">
              {entry.term}
            </div>
            <div className="prose-scenario text-[15px] text-text-body">{entry.meaning}</div>
            <div className="flex flex-col gap-1.5">
              <MetaLabel>Heard as</MetaLabel>
              <div className="text-[14.5px] leading-[1.5] text-text-secondary italic">
                {entry.heardAs}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <MetaLabel>Used when</MetaLabel>
              <div className="text-[14.5px] leading-[1.5] text-text-secondary">{entry.usedWhen}</div>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

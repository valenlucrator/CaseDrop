import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cases } from '../data/cases';
import { CATEGORIES, getEntry, searchEntries, type LearnEntry } from '../data/learn';
import { usePlayer } from '../state/PlayerContext';
import { riseItem } from '../lib/motion';
import { Pressable } from '../components/motion/Pressable';
import { Sheet } from '../components/motion/Sheet';
import { MetaLabel, Screen, Stagger, Title } from '../components/Screen';

export function Learn() {
  const { state } = usePlayer();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LearnEntry['category'] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const entry = open ? getEntry(open) : undefined;

  /** Concepts drawn from cases this player has actually met. */
  const fromYourCases = useMemo(() => {
    const played = new Set(state.submissions.map((s) => s.caseId));
    const ids = new Set(cases.filter((c) => played.has(c.id)).flatMap((c) => c.concepts));
    return [...ids].map(getEntry).filter((e) => e !== undefined);
  }, [state.submissions]);

  const results = useMemo(() => {
    const base = searchEntries(query);
    return category ? base.filter((e) => e.category === category) : base;
  }, [query, category]);

  return (
    <Screen className="gap-5">
      <Title>Learn</Title>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search terms and concepts"
        className="w-full rounded-[12px] border border-border-strong bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onClick={() => setCategory(category === cat ? null : cat)}
            className={`rounded-[7px] border px-2.5 py-1.5 text-[11.5px] leading-none ${
              category === cat
                ? 'border-accent text-text-primary'
                : 'border-border-strong text-text-secondary'
            }`}
          >
            {cat}
          </Pressable>
        ))}
      </div>

      {!query && !category && fromYourCases.length > 0 && (
        <div className="flex flex-col gap-3">
          <MetaLabel>From your cases</MetaLabel>
          <div className="flex flex-wrap gap-2">
            {fromYourCases.map((e) => (
              <Pressable
                key={e.id}
                onClick={() => setOpen(e.id)}
                className="rounded-[7px] border border-accent/40 px-2.5 py-1.5 text-[11.5px] leading-none text-text-primary"
              >
                {e.term}
              </Pressable>
            ))}
          </div>
        </div>
      )}

      <Stagger gap={0.02} className="flex flex-col gap-2.5 pb-2">
        {results.map((e) => (
          <motion.div key={e.id} variants={riseItem}>
            <Pressable
              onClick={() => setOpen(e.id)}
              className="flex w-full flex-col gap-1.5 rounded-[14px] border border-border bg-surface-1 p-4 text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">{e.term}</span>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] text-text-faint uppercase">
                  {e.category}
                </span>
              </div>
              <span className="line-clamp-2 text-[13px] leading-[1.45] text-text-secondary">
                {e.meaning}
              </span>
            </Pressable>
          </motion.div>
        ))}
        {results.length === 0 && (
          <div className="rounded-[14px] border border-border bg-surface-1 p-5 text-[14px] text-text-secondary">
            Nothing matches “{query}”.
          </div>
        )}
      </Stagger>

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
            {entry.related.length > 0 && (
              <div className="flex flex-col gap-2">
                <MetaLabel>Related</MetaLabel>
                <div className="flex flex-wrap gap-2">
                  {entry.related.map((id) => {
                    const r = getEntry(id);
                    return r ? (
                      <Pressable
                        key={id}
                        onClick={() => setOpen(id)}
                        className="rounded-[7px] border border-border-strong px-2.5 py-1.5 text-[11.5px] leading-none text-text-secondary"
                      >
                        {r.term}
                      </Pressable>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

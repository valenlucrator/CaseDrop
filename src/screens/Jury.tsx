import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getCase } from '../data/cases';
import { juryPairs } from '../engine/pairing';
import { usePlayer } from '../state/PlayerContext';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { D, E, riseItem } from '../lib/motion';
import { ArgumentCard } from '../components/ArgumentCard';
import { Screen, Stagger, Title } from '../components/Screen';
import { JuryResult } from './JuryResult';

const COMMIT_MS = 300;

export function Jury() {
  const { state, dispatch } = usePlayer();
  const [index, setIndex] = useState(0);
  const [justVoted, setJustVoted] = useState<'a' | 'b' | null>(null);
  const [committing, setCommitting] = useState<'a' | 'b' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefer cases the player has actually read — voting on a case you have
  // not played is a reading-comprehension test, not a judgement one.
  const pairs = useMemo(() => {
    const played = [...new Set(state.submissions.map((s) => s.caseId))];
    const preferred = juryPairs(played);
    return preferred.length ? preferred : juryPairs();
  }, [state.submissions]);

  const unvoted = useMemo(
    () => pairs.filter((p) => !state.juryVotes.some((v) => v.pairKey === p.key)),
    [pairs, state.juryVotes],
  );

  const pair = justVoted ? pairs[index] : unvoted[0];

  if (!pair) {
    return (
      <Screen className="gap-5">
        <Title>The jury</Title>
        <div className="mt-2 rounded-[14px] border border-border bg-surface-1 p-5 text-[15px] leading-[1.5] text-text-secondary">
          You've voted on every pair in the archive. More arrive with the next case.
        </div>
      </Screen>
    );
  }

  if (justVoted) {
    return (
      <JuryResult
        pair={pair}
        voted={justVoted}
        onNext={() => {
          setJustVoted(null);
          setCommitting(null);
          setIndex(0);
        }}
      />
    );
  }

  const vote = (side: 'a' | 'b') => {
    if (committing) return;
    haptic('lock');
    sound('lock');
    setIndex(pairs.indexOf(pair));
    setCommitting(side);
    dispatch({ type: 'CAST_JURY_VOTE', caseId: pair.caseId, pairKey: pair.key, votedFor: side });
    timer.current = setTimeout(() => setJustVoted(side), COMMIT_MS);
  };

  const c = getCase(pair.caseId);

  return (
    <Screen className="gap-5">
      <div className="flex flex-col gap-[9px]">
        <Title>The jury</Title>
        <div className="text-[14px] leading-[1.45] text-text-secondary">
          Which argument is stronger?
        </div>
      </div>

      {c && (
        <div className="rounded-[12px] border border-border bg-surface-1 px-4 py-3">
          <div className="meta mb-1.5 text-text-muted">{c.title}</div>
          <div className="text-[13.5px] leading-[1.45] text-text-secondary">{c.question}</div>
        </div>
      )}

      <Stagger gap={0.08} className="flex flex-col gap-5">
        {(['a', 'b'] as const).map((side) => {
          const arg = pair[side];
          const chosen = committing === side;
          const dropped = committing !== null && !chosen;
          return (
            <motion.div key={arg.id} variants={riseItem}>
              <motion.div
                animate={{ y: chosen ? -4 : 0, opacity: dropped ? 0.4 : 1 }}
                transition={{ duration: D.base, ease: E.out }}
              >
                <ArgumentCard
                  label={`Argument ${side.toUpperCase()}`}
                  text={arg.text}
                  attribution={arg.author}
                  tone={chosen ? 'win' : 'neutral'}
                >
                  <motion.button
                    type="button"
                    onClick={() => vote(side)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: D.instant, ease: E.out }}
                    className="flex h-[46px] items-center justify-center rounded-[11px] border border-white/14 bg-transparent font-display text-[12px] font-bold tracking-[0.14em] active:bg-surface-2"
                  >
                    VOTE {side.toUpperCase()}
                  </motion.button>
                </ArgumentCard>
              </motion.div>
            </motion.div>
          );
        })}
      </Stagger>

      {/* Labelled honestly — these are archive arguments, not live players. */}
      <div className="pb-2 text-center font-mono text-[12px] leading-none text-text-faint">
        Compared against the case archive
      </div>
    </Screen>
  );
}

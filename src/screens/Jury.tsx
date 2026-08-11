import { useMemo, useState } from 'react';
import { getCase } from '../data/cases';
import { juryPairs } from '../engine/pairing';
import { usePlayer } from '../state/PlayerContext';
import { ArgumentCard } from '../components/ArgumentCard';
import { Screen, Title } from '../components/Screen';
import { JuryResult } from './JuryResult';

export function Jury() {
  const { state, dispatch } = usePlayer();
  const [index, setIndex] = useState(0);
  const [justVoted, setJustVoted] = useState<'a' | 'b' | null>(null);

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
          setIndex(0);
        }}
      />
    );
  }

  const vote = (side: 'a' | 'b') => {
    setIndex(pairs.indexOf(pair));
    dispatch({ type: 'CAST_JURY_VOTE', caseId: pair.caseId, pairKey: pair.key, votedFor: side });
    setJustVoted(side);
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
          <div className="meta mb-1.5 text-text-muted">{c.title.toUpperCase()}</div>
          <div className="text-[13.5px] leading-[1.45] text-text-secondary">{c.question}</div>
        </div>
      )}

      <ArgumentCard label="ARGUMENT A" text={pair.a.text} attribution={pair.a.author}>
        <VoteButton onClick={() => vote('a')}>VOTE A</VoteButton>
      </ArgumentCard>

      <ArgumentCard label="ARGUMENT B" text={pair.b.text} attribution={pair.b.author}>
        <VoteButton onClick={() => vote('b')}>VOTE B</VoteButton>
      </ArgumentCard>

      {/* Labelled honestly — these are archive arguments, not live players. */}
      <div className="pb-2 text-center font-mono text-[12px] leading-none text-text-faint">
        Compared against the case archive
      </div>
    </Screen>
  );
}

function VoteButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] items-center justify-center rounded-[11px] border border-white/14 bg-transparent font-display text-[12px] font-bold tracking-[0.14em] transition-transform duration-100 active:scale-[0.99] active:bg-surface-2"
    >
      {children}
    </button>
  );
}

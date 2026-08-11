import { useMemo } from 'react';
import { getCase } from '../data/cases';
import { RATING_ENABLED } from '../engine/rating';
import { usePlayer } from '../state/PlayerContext';
import { accuracy, juryWinRate } from '../state/reducer';
import { clear } from '../state/storage';
import { MetaLabel, Screen } from '../components/Screen';

const DIMENSIONS = [
  ['Issue spotting', 'issueSpotting', 25],
  ['Evidence', 'evidenceUse', 25],
  ['Reasoning', 'reasoning', 20],
  ['Persuasion', 'persuasion', 10],
  ['Judgment', 'decision', 20],
] as const;

export function Profile() {
  const { state, dispatch } = usePlayer();

  const judged = useMemo(() => state.submissions.filter((s) => s.score), [state.submissions]);
  const acc = accuracy(state);
  const winRate = juryWinRate(state);

  const profile = useMemo(() => {
    if (!judged.length) return null;
    return DIMENSIONS.map(([label, key, max]) => {
      const avg = judged.reduce((sum, s) => sum + (s.score![key] ?? 0), 0) / judged.length;
      return { label, value: Math.round((avg / max) * 100) };
    });
  }, [judged]);

  return (
    <Screen className="gap-[26px]">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/9 bg-surface-3 font-mono text-[14px] font-semibold text-[#a8aeb6]">
          {state.streak || 0}
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[22px] leading-none font-bold tracking-[-0.02em]">You</h1>
          <div className="text-[13px] leading-none text-text-secondary">
            {state.casesCompleted === 0
              ? 'No cases yet'
              : `${state.casesCompleted} case${state.casesCompleted === 1 ? '' : 's'} played`}
          </div>
        </div>
      </div>

      {/*
        rating === null in v1, so the ladder is not rendered at all. Streak
        and accuracy carry the screen instead. One field flips this later.
      */}
      <div className="flex border-y border-border py-4">
        <Stat value={state.streak > 0 ? `${state.streak}d` : '—'} label="STREAK" />
        <Stat
          value={
            state.juryRecord.won + state.juryRecord.lost > 0
              ? `${state.juryRecord.won}–${state.juryRecord.lost}`
              : '—'
          }
          label="JURY RECORD"
        />
        <Stat value={winRate === null ? '—' : `${winRate}%`} label="WIN RATE" />
      </div>

      <div className="flex flex-col gap-4">
        <MetaLabel>LEGAL PROFILE</MetaLabel>
        {profile ? (
          <div className="flex flex-col gap-[13px]">
            {profile.map((d) => (
              <div key={d.label} className="flex items-center gap-3.5">
                <div className="w-[104px] shrink-0 text-[13.5px] leading-none text-text-body">
                  {d.label}
                </div>
                <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
                  <div
                    className={`h-full ${d.value >= 70 ? 'bg-text-primary' : 'bg-text-faint'}`}
                    style={{ width: `${d.value}%` }}
                  />
                </div>
                <div
                  className={`w-[26px] text-right font-mono text-[13px] leading-none ${
                    d.value >= 70 ? '' : 'text-text-secondary'
                  }`}
                >
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-border bg-surface-1 p-5 text-[14px] leading-[1.5] text-text-secondary">
            Your profile builds once verdicts come in. Play a case and come back tomorrow.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface-1 p-5">
        <MetaLabel>BENCHMARK AGREEMENT</MetaLabel>
        {acc === null ? (
          <div className="text-[14px] leading-[1.5] text-text-secondary">
            Not enough decided cases yet. Genuinely split cases don't count — there's nothing to
            agree with.
          </div>
        ) : (
          <>
            <div className="font-display text-[21px] leading-none font-bold tracking-[-0.02em]">
              {acc}% agreement
            </div>
            <div className="text-[14px] leading-[1.5] text-text-secondary">
              Across {state.benchmarkAgreement.total} case
              {state.benchmarkAgreement.total === 1 ? '' : 's'} where the benchmark took a side.
              It's an opinion, not a score.
            </div>
          </>
        )}
      </div>

      {state.submissions.length > 0 && (
        <div className="flex flex-col gap-3.5 pb-1.5">
          <MetaLabel>RECENT CASES</MetaLabel>
          {state.submissions.map((s, i) => {
            const c = getCase(s.caseId);
            const won = s.juryResult ? s.juryResult.yours > s.juryResult.theirs : null;
            return (
              <div
                key={`${s.caseId}-${s.playedAt}`}
                className={`flex items-center justify-between ${
                  i < state.submissions.length - 1 ? 'border-b border-white/6 pb-3' : ''
                }`}
              >
                <div className="text-[14.5px] leading-none font-medium">{c?.title ?? s.caseId}</div>
                <div
                  className={`font-mono text-[12.5px] leading-none font-medium ${
                    won === null ? 'text-text-muted' : won ? 'text-win' : 'text-loss'
                  }`}
                >
                  {won === null ? 'PENDING' : `${won ? 'WON' : 'LOST'} · ${s.juryResult!.yours}%`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => {
            clear();
            dispatch({ type: 'RESET' });
          }}
          className="mb-4 rounded-[10px] border border-border py-2.5 text-[12px] text-text-faint"
        >
          Reset local progress (dev only)
          {RATING_ENABLED ? '' : ' · rating gate closed'}
        </button>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="font-mono text-[16px] leading-none font-medium">{value}</div>
      <div className="text-[10.5px] leading-none text-text-muted">{label}</div>
    </div>
  );
}

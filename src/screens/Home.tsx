import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { caseForDate, getCase } from '../data/cases';
import { usePlayer } from '../state/PlayerContext';
import { awaitingVerdict, hasPlayed, pendingResults } from '../state/reducer';
import { haptic } from '../lib/haptics';
import { D, E, riseItem } from '../lib/motion';
import { PlayerCountStat } from '../components/PlayerCount';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Rise, Screen, Stagger } from '../components/Screen';

/**
 * Module-scoped so it survives Home unmounting during the play flow. Without
 * it the streak would pop on every return to Home rather than on the one
 * occasion it changed.
 */
let seenStreak: number | null = null;

export function Home() {
  const navigate = useNavigate();
  const { state } = usePlayer();
  const [popStreak, setPopStreak] = useState(false);

  const today = caseForDate();
  const played = hasPlayed(state, today.id);
  const ready = pendingResults(state);
  const waiting = awaitingVerdict(state);
  const recent = state.submissions.slice(0, 3);

  useEffect(() => {
    if (seenStreak !== null && state.streak > seenStreak) {
      setPopStreak(true);
      haptic('result');
      const t = setTimeout(() => setPopStreak(false), D.base * 1000);
      seenStreak = state.streak;
      return () => clearTimeout(t);
    }
    seenStreak = state.streak;
  }, [state.streak]);

  return (
    <Screen className="gap-[26px]">
      <div className="flex items-center justify-between">
        <div className="font-display text-[21px] leading-none font-bold tracking-[-0.035em]">
          CaseDrop
        </div>
        <motion.div
          animate={popStreak ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: D.base, ease: E.out }}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/9 bg-surface-3 font-mono text-[11px] font-semibold text-[#a8aeb6]"
        >
          {state.streak > 0 ? state.streak : '—'}
        </motion.div>
      </div>

      {/*
        Pending result is its own entry point, not a status line. This is the
        second way into the flow — and the pulsing dot is the return hook, the
        only element in the app allowed to loop indefinitely.
      */}
      {ready.map((s) => {
        const c = getCase(s.caseId);
        return (
          <motion.button
            key={s.caseId}
            type="button"
            onClick={() => navigate(`/result/${s.caseId}`)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: D.base, ease: E.out }}
            className="flex items-center justify-between rounded-[16px] border border-accent/40 bg-surface-1 p-[18px_20px] text-left"
          >
            <div className="flex flex-col gap-1.5">
              <div className="meta text-accent">Verdict in</div>
              <div className="text-[15px] font-semibold">{c?.title ?? s.caseId}</div>
            </div>
            <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
          </motion.button>
        );
      })}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: D.base, ease: E.out }}
        className="flex flex-col gap-5 rounded-[20px] border border-border bg-surface-1 p-[24px_22px_22px]"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${played ? 'bg-text-faint' : 'bg-win'}`} />
          <MetaLabel className="text-text-secondary">
            {played ? 'Played today' : "Today's case"}
          </MetaLabel>
        </div>

        <div className="font-display text-[38px] leading-[0.96] font-extrabold tracking-[-0.025em] uppercase">
          {today.title}
        </div>

        <div className="text-[13.5px] leading-[1.5] text-text-secondary">{today.tags.join(' · ')}</div>

        <div className="flex gap-[22px] border-t border-border pt-1">
          <div className="flex flex-col gap-[5px] pt-3.5">
            <div className="font-mono text-[17px] leading-none">{today.estimatedMinutes} min</div>
            <div className="text-[11.5px] leading-none text-text-muted">to play</div>
          </div>
          <PlayerCountStat count={state.casesCompleted * 3 + 8} noun="players today" />
        </div>

        <PrimaryButton onClick={() => navigate(`/play/${today.id}`)}>
          {played ? 'PLAY AGAIN' : 'PLAY CASE'}
        </PrimaryButton>
      </motion.div>

      {waiting.length > 0 && (
        <div className="rounded-[14px] border border-border bg-surface-1 px-5 py-4 text-[13.5px] leading-[1.45] text-text-secondary">
          {waiting.length === 1 ? 'One argument is' : `${waiting.length} arguments are`} with the
          jury. Results land here when they're in.
        </div>
      )}

      <div className="flex border-t border-border pt-[18px]">
        <Stat label="STREAK" value={state.streak > 0 ? `${state.streak}d` : '—'} />
        <Stat label="CASES" value={String(state.casesCompleted)} />
        <Stat
          label="JURY"
          value={
            state.juryRecord.won + state.juryRecord.lost > 0
              ? `${state.juryRecord.won}–${state.juryRecord.lost}`
              : '—'
          }
        />
      </div>

      {recent.length > 0 && (
        <Stagger gap={0.04} className="flex flex-col gap-3.5">
          <Rise>
            <MetaLabel>Recent</MetaLabel>
          </Rise>
          <div className="flex flex-col gap-3">
            {recent.map((s, i) => {
              const c = getCase(s.caseId);
              const won = s.juryResult ? s.juryResult.yours > s.juryResult.theirs : null;
              return (
                <motion.div
                  key={`${s.caseId}-${s.playedAt}`}
                  variants={riseItem}
                  className={`flex flex-col gap-[5px] ${
                    i < recent.length - 1 ? 'border-b border-white/6 pb-3' : ''
                  }`}
                >
                  <div className="text-[15px] leading-[1.2] font-semibold">{c?.title ?? s.caseId}</div>
                  <div className="flex items-baseline gap-2">
                    {s.status === 'pending' ? (
                      <span className="text-[12.5px] leading-none font-medium text-text-muted">
                        With the jury
                      </span>
                    ) : (
                      <>
                        <span
                          className={`text-[12.5px] leading-none font-medium ${
                            won ? 'text-win' : 'text-loss'
                          }`}
                        >
                          {won ? 'Argument won' : 'Argument lost'}
                        </span>
                        <span className="text-[12.5px] leading-none text-text-muted">
                          {s.juryResult?.yours}% voted for you
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Stagger>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="text-[10.5px] leading-none text-text-muted">{label}</div>
      <div className="font-display text-[15px] leading-none font-semibold">{value}</div>
    </div>
  );
}

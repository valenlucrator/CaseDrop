import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCase } from '../data/cases';
import { seedArguments } from '../engine/pairing';
import { isEarly } from '../engine/population';
import { usePlayer } from '../state/PlayerContext';
import { resultFor } from '../state/reducer';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { D, E } from '../lib/motion';
import { ArgumentCard } from '../components/ArgumentCard';
import { CountUp } from '../components/motion/CountUp';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';
import type { ScoreBreakdown } from '../types/player';

/**
 * The heaviest sequence in the app, because it is the payoff. Order matters
 * more than speed here — roughly:
 *   0ms    outcome header
 *   250ms  hold, then the percentage counts up
 *   900ms  record delta slides in from below
 *   1000ms your argument, then the opponent's 100ms later
 *   1200ms score bars fill, staggered
 * It is allowed to take two seconds. This screen is the reward.
 */
const T = {
  header: 0,
  count: 0.25,
  delta: 0.9,
  yours: 1.0,
  opponent: 1.1,
  bars: 1.2,
};

export function PersonalResult() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePlayer();
  const [params] = useSearchParams();
  const [counting, setCounting] = useState(false);

  const c = getCase(caseId);
  // A case can be played more than once as the rotation repeats; `at` names the play.
  const submission = resultFor(state, caseId, params.get('at'));
  const won = submission?.juryResult
    ? submission.juryResult.yours > submission.juryResult.theirs
    : null;

  // Opening the result is what marks it seen — that clears the Home badge.
  useEffect(() => {
    if (submission?.status === 'judged') {
      dispatch({ type: 'MARK_SEEN', caseId, playedAt: submission.playedAt });
    }
  }, [submission?.status, submission?.playedAt, caseId, dispatch]);

  useEffect(() => {
    if (won === null) return;
    const t = setTimeout(() => {
      setCounting(true);
      haptic('result');
      sound(won ? 'win' : 'loss');
    }, T.count * 1000);
    return () => clearTimeout(t);
  }, [won]);

  if (!c || !submission) return <Screen>No result here yet.</Screen>;

  if (submission.status === 'pending' || !submission.juryResult) {
    return (
      <Screen className="gap-4">
        <MetaLabel>With the jury</MetaLabel>
        <div className="font-display text-[30px] leading-none font-extrabold uppercase">{c.title}</div>
        <div className="text-[15px] leading-[1.5] text-text-secondary">
          Your argument is out for verdict. It'll be waiting on Home when it's in.
        </div>
        <Spacer />
        <PrimaryButton variant="secondary" onClick={() => navigate('/')}>
          BACK
        </PrimaryButton>
      </Screen>
    );
  }

  const { juryResult: jury, score } = submission;
  const opponent = seedArguments.find((a) => a.id === submission.opponentArgumentId);
  const agreedWithBenchmark =
    c.benchmark.favored === null ? null : submission.choice === c.benchmark.favored;

  const step = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: D.base, ease: E.out, delay },
  });

  return (
    <Screen pad="pb-0" className="gap-[26px]">
      <div className="flex flex-col gap-3.5">
        <motion.div
          {...step(T.header)}
          className={`meta ${won ? 'text-win' : 'text-loss'}`}
        >
          {won ? 'Your argument won' : 'Your argument lost'}
        </motion.div>
        <div className="flex items-baseline gap-3.5">
          <CountUp
            to={jury.yours}
            start={counting}
            placeholder="—"
            suffix="%"
            className="font-mono text-[68px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums"
          />
          <div className="font-mono text-[15px] leading-none text-text-muted">vs {jury.theirs}%</div>
        </div>
        <div className="font-mono text-[12.5px] leading-none text-text-muted">
          {isEarly(jury.jurors) ? "You're early — a small jury" : `${jury.jurors} jurors voted`}
        </div>
      </div>

      {/* Rating is null in v1, so the delta slot carries the record instead. */}
      <motion.div
        {...step(T.delta)}
        className="flex items-center justify-between rounded-[14px] border border-border bg-surface-1 p-[18px_20px]"
      >
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] leading-none text-text-muted">RECORD</div>
          <div className="font-mono text-[20px] leading-none">
            {state.juryRecord.won}–{state.juryRecord.lost}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.12, 1], opacity: 1 }}
            transition={{ duration: D.base, ease: E.out, delay: T.delta + 0.1 }}
            className={`font-mono text-[20px] leading-none font-semibold ${won ? 'text-win' : 'text-loss'}`}
          >
            {won ? '+1' : '−1'}
          </motion.div>
        </div>
      </motion.div>
      <div className="-mt-5 text-right text-[11.5px] leading-none text-text-faint">
        Archive match — no rating attached
      </div>

      <div className="flex flex-col gap-3">
        <motion.div {...step(T.yours)}>
          <ArgumentCard
            label="Yours"
            text={submission.argument}
            percent={jury.yours}
            tone={won ? 'win' : 'neutral'}
          />
        </motion.div>
        {opponent && (
          <motion.div {...step(T.opponent)}>
            <ArgumentCard
              label={`Opponent · ${opponent.author}`}
              text={opponent.text}
              percent={jury.theirs}
              tone="muted"
            />
          </motion.div>
        )}
      </div>

      {score && <ScorePanel score={score} />}

      <motion.div
        {...step(T.bars + 0.4)}
        className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface-1 p-5"
      >
        <MetaLabel>The benchmark</MetaLabel>
        <div className="text-[13px] leading-none text-text-faint">
          {agreedWithBenchmark === null
            ? 'This case is genuinely split — there is no favoured side.'
            : agreedWithBenchmark
              ? 'You agreed with the benchmark.'
              : 'You went against the benchmark. It is an opinion, not an answer.'}
        </div>
        <div className="prose-scenario mt-1.5 text-[15px] text-text-body">{c.benchmark.reasoning}</div>
      </motion.div>

      <Spacer />

      <StickyFooter>
        <PrimaryButton onClick={() => navigate('/')}>DONE</PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}

/** Shown only once the jury result exists — a number on an unjudged submission is noise. */
function ScorePanel({ score }: { score: ScoreBreakdown }) {
  const rows: [string, number, number][] = [
    ['Decision', score.decision, 20],
    ['Evidence use', score.evidenceUse, 25],
    ['Reasoning', score.reasoning, 20],
    ['Issue spotting', score.issueSpotting, 25],
    ['Persuasion', score.persuasion, 10],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: D.base, ease: E.out, delay: T.bars }}
      className="flex flex-col gap-4 rounded-[14px] border border-border bg-surface-1 p-5"
    >
      <div className="flex items-baseline justify-between">
        <MetaLabel>Breakdown</MetaLabel>
        <CountUp
          to={score.total}
          delay={T.bars}
          duration={D.slow}
          className="font-mono text-[20px] leading-none font-semibold tabular-nums"
        />
      </div>
      <div className="flex flex-col gap-3">
        {rows.map(([label, value, max], i) => (
          <div key={label} className="flex items-center gap-3.5">
            <div className="w-[104px] shrink-0 text-[13.5px] leading-none text-text-body">{label}</div>
            <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(value / max) * 100}%` }}
                transition={{ duration: D.slow, ease: E.out, delay: T.bars + i * 0.06 }}
                className={`h-full ${value / max >= 0.7 ? 'bg-text-primary' : 'bg-text-faint'}`}
              />
            </div>
            <div className="w-[38px] text-right font-mono text-[13px] leading-none">
              {value}/{max}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

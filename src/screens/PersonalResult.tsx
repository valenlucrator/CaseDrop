import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCase } from '../data/cases';
import { seedArguments } from '../engine/pairing';
import { isEarly } from '../engine/population';
import { usePlayer } from '../state/PlayerContext';
import { submissionFor } from '../state/reducer';
import { ArgumentCard } from '../components/ArgumentCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';
import type { ScoreBreakdown } from '../types/player';

/**
 * Reached from Home, never by continuing forward from a session. By the time
 * this renders the submission is already judged — nothing is computed while
 * the player watches.
 */
export function PersonalResult() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePlayer();

  const c = getCase(caseId);
  const submission = submissionFor(state, caseId);

  // Opening the result is what marks it seen — that clears the Home badge.
  useEffect(() => {
    if (submission?.status === 'judged') dispatch({ type: 'MARK_SEEN', caseId });
  }, [submission?.status, caseId, dispatch]);

  if (!c || !submission) return <Screen>No result here yet.</Screen>;

  if (submission.status === 'pending' || !submission.juryResult) {
    return (
      <Screen className="gap-4">
        <MetaLabel>WITH THE JURY</MetaLabel>
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
  const won = jury.yours > jury.theirs;
  const opponent = seedArguments.find((a) => a.id === submission.opponentArgumentId);
  const agreedWithBenchmark =
    c.benchmark.favored === null ? null : submission.choice === c.benchmark.favored;

  return (
    <Screen pad="pb-0" className="gap-[26px]">
      <div className="flex flex-col gap-3.5">
        <div className={`meta ${won ? 'text-win' : 'text-loss'}`}>
          {won ? 'YOUR ARGUMENT WON' : 'YOUR ARGUMENT LOST'}
        </div>
        <div className="flex items-baseline gap-3.5">
          <div className="font-mono text-[68px] leading-[0.9] font-semibold tracking-[-0.04em]">
            {jury.yours}%
          </div>
          <div className="font-mono text-[15px] leading-none text-text-muted">vs {jury.theirs}%</div>
        </div>
        <div className="font-mono text-[12.5px] leading-none text-text-muted">
          {isEarly(jury.jurors) ? "You're early — a small jury" : `${jury.jurors} jurors voted`}
        </div>
      </div>

      {/* Rating is null in v1, so this slot carries the honest thing instead. */}
      <div className="flex items-center justify-between rounded-[14px] border border-border bg-surface-1 p-[18px_20px]">
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] leading-none text-text-muted">RECORD</div>
          <div className="font-mono text-[20px] leading-none">
            {state.juryRecord.won}–{state.juryRecord.lost}
          </div>
        </div>
        <div className="max-w-[46%] text-right text-[11.5px] leading-[1.35] text-text-faint">
          Archive match — no rating attached
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ArgumentCard
          label="YOURS"
          text={submission.argument}
          percent={jury.yours}
          tone={won ? 'win' : 'neutral'}
        />
        {opponent && (
          <ArgumentCard
            label={`OPPONENT · ${opponent.author.toUpperCase()}`}
            text={opponent.text}
            percent={jury.theirs}
            tone="muted"
          />
        )}
      </div>

      {score && <ScorePanel score={score} />}

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface-1 p-5">
        <MetaLabel>THE BENCHMARK</MetaLabel>
        <div className="text-[13px] leading-none text-text-faint">
          {agreedWithBenchmark === null
            ? 'This case is genuinely split — there is no favoured side.'
            : agreedWithBenchmark
              ? 'You agreed with the benchmark.'
              : 'You went against the benchmark. It is an opinion, not an answer.'}
        </div>
        <div className="mt-1.5 text-[15px] leading-[1.5] text-pretty text-text-body">
          {c.benchmark.reasoning}
        </div>
      </div>

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
    <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-surface-1 p-5">
      <div className="flex items-baseline justify-between">
        <MetaLabel>BREAKDOWN</MetaLabel>
        <div className="font-mono text-[20px] leading-none font-semibold">{score.total}</div>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map(([label, value, max]) => (
          <div key={label} className="flex items-center gap-3.5">
            <div className="w-[104px] shrink-0 text-[13.5px] leading-none text-text-body">{label}</div>
            <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
              <div
                className={`h-full ${value / max >= 0.7 ? 'bg-text-primary' : 'bg-text-faint'}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <div className="w-[38px] text-right font-mono text-[13px] leading-none">
              {value}/{max}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

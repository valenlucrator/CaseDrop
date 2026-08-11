import { useNavigate, useParams } from 'react-router-dom';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { usePlayer } from '../state/PlayerContext';
import { wordCount } from '../engine/scoring';
import { EvidenceChips } from '../components/EvidenceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen, Title } from '../components/Screen';

const LIMIT = 60;

export function Argument() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const { dispatch } = usePlayer();
  const c = getCase(caseId);

  if (!c) return <Screen>Case not found.</Screen>;

  const words = wordCount(play.argument);
  const over = words > LIMIT;
  const canSubmit = words > 0 && !over && play.choice !== null && play.selected.length === c.selectCount;

  const submit = () => {
    if (!canSubmit) return;
    dispatch({
      type: 'SUBMIT_CASE',
      caseId: c.id,
      evidenceSelected: [play.selected[0], play.selected[1]],
      choice: play.choice!,
      argument: play.argument.trim(),
    });
    navigate(`/play/${c.id}/reveal`);
  };

  return (
    <Screen pad="pb-4" className="gap-[18px]">
      <div className="flex flex-col gap-[9px]">
        <Title>Make your case</Title>
        <div className="text-[14px] leading-[1.45] text-text-secondary">
          Give the strongest reason for your decision. Maximum {LIMIT} words.
        </div>
      </div>

      <EvidenceChips items={c.evidence.filter((e) => play.selected.includes(e.id))} />

      <textarea
        value={play.argument}
        onChange={(e) => playDispatch({ type: 'SET_ARGUMENT', argument: e.target.value })}
        spellCheck={false}
        placeholder="Write it as if the jury only reads this."
        className="h-[190px] w-full resize-none rounded-[14px] border border-border-strong bg-surface-1 p-[18px] text-[16.5px] leading-[1.5] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      <div className="flex items-center justify-between">
        <div className="text-[12.5px] leading-none text-text-muted">
          The jury reads fast. So should you.
        </div>
        <div className={`font-mono text-[12.5px] leading-none ${over ? 'text-loss' : 'text-text-muted'}`}>
          {words} / {LIMIT} words
        </div>
      </div>

      {/* mt-auto keeps the button reachable when the keyboard shrinks the viewport */}
      <div className="mt-auto pb-6">
        <PrimaryButton disabled={!canSubmit} onClick={submit}>
          {over ? `${words - LIMIT} WORDS OVER` : 'SUBMIT ARGUMENT'}
        </PrimaryButton>
      </div>
    </Screen>
  );
}

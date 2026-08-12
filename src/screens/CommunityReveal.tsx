import { useNavigate, useParams } from 'react-router-dom';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { usePlayer } from '../state/PlayerContext';
import { submissionFor } from '../state/reducer';
import { communitySplit } from '../engine/pairing';
import { PlayerCount } from '../components/PlayerCount';
import { PrimaryButton } from '../components/PrimaryButton';
import { SplitBar } from '../components/SplitBar';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';

/**
 * Arrives AFTER the argument, never before. Seeing the split before writing
 * is a thumb on the scale, and the reveal lands harder on an argument the
 * player can no longer edit.
 */
export function CommunityReveal() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const { state } = usePlayer();
  const c = getCase(caseId);

  if (!c) return <Screen>Case not found.</Screen>;

  const choice = play.choice ?? submissionFor(state, c.id)?.choice ?? 'a';

  const { a: aPct, b: bPct } = communitySplit(c);
  const yours = choice === 'a' ? aPct : bPct;
  const decisions = Math.round(state.casesCompleted * 3 + 8);

  const verdict =
    yours >= 50
      ? { head: "You're with the majority.", tail: 'Now win the argument.' }
      : { head: "You're in the minority.", tail: 'That is where the points are.' };

  return (
    <Screen pad="pb-0">
      <div className="flex flex-col gap-3 border-b border-border pb-[34px]">
        <MetaLabel>YOU CHOSE</MetaLabel>
        <div className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] uppercase">
          {choice === 'a' ? c.options.a : c.options.b}
        </div>
      </div>

      <div className="flex flex-col gap-[26px] pt-[34px]">
        <MetaLabel>COMMUNITY</MetaLabel>
        <SplitBar label={c.options.a} percent={aPct} mine={choice === 'a'} />
        <SplitBar label={c.options.b} percent={bPct} mine={choice === 'b'} />
        <PlayerCount count={decisions} noun="decisions" />
      </div>

      <Spacer />

      <StickyFooter>
        <div
          className={`mb-4 rounded-[14px] border bg-surface-1 p-[18px_20px] text-[15px] leading-[1.4] font-medium ${
            yours >= 50 ? 'border-border' : 'border-diverge/28'
          }`}
        >
          <span className={yours >= 50 ? '' : 'text-diverge'}>{verdict.head}</span>{' '}
          <span className="text-text-secondary">{verdict.tail}</span>
        </div>

        <PrimaryButton
          onClick={() => {
            playDispatch({ type: 'RESET' });
            navigate('/jury');
          }}
        >
          SERVE ON A JURY
        </PrimaryButton>

        <button
          type="button"
          onClick={() => {
            playDispatch({ type: 'RESET' });
            navigate('/');
          }}
          className="mt-3 w-full py-2 text-[12.5px] text-text-muted"
        >
          Done for today
        </button>
      </StickyFooter>
    </Screen>
  );
}

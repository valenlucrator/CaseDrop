import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { usePlayer } from '../state/PlayerContext';
import { submissionFor } from '../state/reducer';
import { communitySplit } from '../engine/pairing';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { D, E } from '../lib/motion';
import { PlayerCount } from '../components/PlayerCount';
import { PrimaryButton } from '../components/PrimaryButton';
import { SplitBar } from '../components/SplitBar';
import { MetaLabel, Screen, Spacer, StickyFooter } from '../components/Screen';

const HOLD_MS = 200;
const VERDICT_DELAY_MS = HOLD_MS + D.reveal * 1000 + 150;

/**
 * Arrives AFTER the argument, never before. Seeing the split before writing
 * is a thumb on the scale, and the reveal lands harder on an argument the
 * player can no longer edit.
 *
 * The 200ms hold before anything moves is deliberate. Bars that are already
 * animating when the screen arrives read as a loading state; bars that sit
 * still and then go read as a result coming in.
 */
export function CommunityReveal() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const { state } = usePlayer();
  const c = getCase(caseId);

  const [revealed, setRevealed] = useState(false);
  const [verdictIn, setVerdictIn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setRevealed(true);
      haptic('reveal');
      sound('reveal');
    }, HOLD_MS);
    const t2 = setTimeout(() => setVerdictIn(true), VERDICT_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!c) return <Screen>Case not found.</Screen>;

  const choice = play.choice ?? submissionFor(state, c.id)?.choice ?? 'a';
  const { a: aPct, b: bPct } = communitySplit(c);
  const yours = choice === 'a' ? aPct : bPct;
  const minority = yours < 50;
  const decisions = Math.round(state.casesCompleted * 3 + 8);

  return (
    <Screen pad="pb-0">
      <div className="flex flex-col gap-3 border-b border-border pb-[34px]">
        <MetaLabel>You chose</MetaLabel>
        <div className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] uppercase">
          {choice === 'a' ? c.options.a : c.options.b}
        </div>
      </div>

      <div className="flex flex-col gap-[26px] pt-[34px]">
        <MetaLabel>Community</MetaLabel>
        <SplitBar label={c.options.a} percent={aPct} mine={choice === 'a'} start={revealed} />
        <SplitBar label={c.options.b} percent={bPct} mine={choice === 'b'} start={revealed} />
        <PlayerCount count={decisions} noun="decisions" />
      </div>

      <Spacer />

      <StickyFooter>
        {/*
          Being in the minority is the more interesting outcome, so it gets
          the stronger entrance and the amber. Majority is a nod; minority is
          a finding.
        */}
        <div className="mb-4 min-h-[62px]">
          <AnimatePresence>
            {verdictIn && (
              <motion.div
                initial={{ opacity: 0, scale: minority ? 0.96 : 1, y: minority ? 0 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: minority ? D.base : D.fast, ease: E.out }}
                className={`rounded-[14px] border bg-surface-1 p-[18px_20px] text-[15px] leading-[1.4] font-medium ${
                  minority ? 'border-diverge/28' : 'border-border'
                }`}
              >
                {minority ? (
                  <>
                    <span className="text-diverge">You're in the {yours}%.</span>{' '}
                    <span className="text-text-secondary">That is where the points are.</span>
                  </>
                ) : (
                  <>
                    You're with the majority.{' '}
                    <span className="text-text-secondary">Now win the argument.</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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

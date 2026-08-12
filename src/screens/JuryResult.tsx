import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { juryPairSplit, type JuryPair } from '../engine/pairing';
import { isEarly } from '../engine/population';
import { haptic } from '../lib/haptics';
import { D, E } from '../lib/motion';
import { PlayerCount } from '../components/PlayerCount';
import { PrimaryButton } from '../components/PrimaryButton';
import { SplitBar } from '../components/SplitBar';
import { MetaLabel, Screen, Spacer } from '../components/Screen';

const HOLD_MS = 150;
const CALLOUT_DELAY_MS = HOLD_MS + D.base * 1000 + 150;

interface Props {
  pair: JuryPair;
  voted: 'a' | 'b';
  onNext: () => void;
}

export function JuryResult({ pair, voted, onNext }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [calloutIn, setCalloutIn] = useState(false);

  const split = juryPairSplit(pair);
  const yours = voted === 'a' ? split.a : split.b;
  const diverged = yours < 50;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setRevealed(true);
      haptic('reveal');
    }, HOLD_MS);
    const t2 = setTimeout(() => setCalloutIn(true), CALLOUT_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <Screen className="gap-[30px]">
      <div className="flex flex-col gap-3">
        <MetaLabel>You voted</MetaLabel>
        <div className="font-display text-[36px] leading-none font-extrabold tracking-[-0.03em] uppercase">
          Argument {voted.toUpperCase()}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: D.base, ease: E.out }}
          className={`text-[16px] leading-none font-medium ${diverged ? 'text-diverge' : 'text-win'}`}
        >
          {isEarly(split.jurors)
            ? diverged
              ? 'The room went the other way.'
              : 'The room agreed with you.'
            : `${yours}% agreed with you.`}
        </motion.div>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-7">
        <SplitBar
          label="Argument A"
          percent={split.a}
          size="sm"
          tone={voted === 'a' ? 'win' : 'neutral'}
          mine={voted === 'a'}
          start={revealed}
          duration={D.base}
        />
        <SplitBar
          label="Argument B"
          percent={split.b}
          size="sm"
          tone={voted === 'b' ? 'win' : 'neutral'}
          mine={voted === 'b'}
          start={revealed}
          duration={D.base}
        />
        <PlayerCount count={split.jurors} noun="jurors voted" />
      </div>

      {/*
        The payload of the screen, so it arrives after the split rather than
        with it. Amber is divergence from consensus and only that — in v1
        there is no rank population, so this says what is actually true.
      */}
      <AnimatePresence>
        {calloutIn && diverged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: D.base, ease: E.out }}
            className="flex flex-col gap-2.5 rounded-[14px] border border-diverge/28 bg-surface-1 p-5"
          >
            <MetaLabel className="text-diverge">You diverged</MetaLabel>
            <div className="text-[15.5px] leading-[1.45] text-text-body">
              The jury preferred the other argument. Worth re-reading it to see what it did that
              yours did not.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Spacer />

      <div className="pb-1.5">
        <PrimaryButton variant="secondary" onClick={onNext}>
          NEXT PAIR
        </PrimaryButton>
      </div>
    </Screen>
  );
}

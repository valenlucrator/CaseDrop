import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { D, E, riseItem } from '../lib/motion';
import { EvidenceChips } from '../components/EvidenceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetaLabel, Rise, Screen, Spacer, Stagger, StickyFooter } from '../components/Screen';
import type { Side } from '../types/case';

/**
 * Commit choreography, in milliseconds:
 *   0    haptic, button compress, unselected option drops out, chosen pulses
 *   260  hold ends — nothing moves during it, that beat is the point
 *   260  accent line sweeps across the chosen card (D.slow)
 *   660  navigate
 *
 * The whole mechanic is irreversibility. Shortening this to feel snappy
 * throws away the only moment where that lands.
 */
const HOLD_MS = 260;
const COMMIT_MS = HOLD_MS + D.slow * 1000;

export function Decision() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const c = getCase(caseId);
  const [locking, setLocking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!c) return <Screen>Case not found.</Screen>;

  const opened = c.evidence.filter((e) => play.selected.includes(e.id));

  const lockIn = () => {
    if (play.choice === null || locking) return;
    setLocking(true);
    haptic('lock');
    sound('lock');
    timer.current = setTimeout(() => navigate(`/play/${c.id}/argument`), COMMIT_MS);
  };

  const option = (side: Side, label: string) => {
    const chosen = play.choice === side;
    const dropped = locking && !chosen;
    return (
      <motion.button
        type="button"
        disabled={locking}
        onClick={() => {
          haptic('tap');
          playDispatch({ type: 'SET_CHOICE', choice: side });
        }}
        whileTap={locking ? undefined : { scale: 0.99 }}
        animate={{
          opacity: dropped ? 0.15 : play.choice !== null && !chosen ? 0.5 : 1,
          borderColor: chosen
            ? locking
              ? ['#4C8DF6', '#7BABF9', '#4C8DF6']
              : '#4C8DF6'
            : 'rgba(255,255,255,0.1)',
        }}
        transition={{ duration: locking ? HOLD_MS / 1000 : D.base, ease: E.out }}
        className="relative flex items-center justify-between overflow-hidden rounded-[16px] border bg-transparent p-[26px_22px] text-left"
      >
        <span className="font-display text-[24px] leading-none font-bold tracking-[-0.015em] uppercase">
          {label}
        </span>
        <motion.span
          animate={{ backgroundColor: chosen ? '#4C8DF6' : '#3e444b' }}
          transition={{ duration: D.fast }}
          className="h-[11px] w-[11px] shrink-0 rounded-full"
        />

        {/* The sweep: a thin accent line crossing the card you committed to. */}
        {locking && chosen && (
          <motion.span
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: D.slow, ease: E.inOut, delay: HOLD_MS / 1000 }}
            className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-accent/70 to-transparent"
            style={{ width: '60%' }}
          />
        )}
      </motion.button>
    );
  };

  return (
    <Screen pad="pb-0">
      <Stagger gap={0.06}>
        <Rise>
          <MetaLabel className="mb-8">{c.title}</MetaLabel>
        </Rise>
        <Rise>
          <h1 className="font-display text-[40px] leading-[0.98] font-extrabold tracking-[-0.03em] uppercase">
            What would you do?
          </h1>
        </Rise>
        <Rise>
          <div className="mt-5 text-[15px] leading-[1.5] text-text-secondary">{c.question}</div>
        </Rise>
        <Rise>
          <div className="mt-7 flex flex-col gap-3">
            <MetaLabel>What you opened</MetaLabel>
            <EvidenceChips items={opened} />
          </div>
        </Rise>
      </Stagger>

      <Spacer />

      <StickyFooter>
        <motion.div
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.06 } } }}
          initial="initial"
          animate="animate"
          className="mb-5 flex flex-col gap-3"
        >
          <motion.div variants={riseItem}>{option('a', c.options.a)}</motion.div>
          <motion.div variants={riseItem}>{option('b', c.options.b)}</motion.div>
        </motion.div>

        <motion.div
          animate={{ opacity: locking ? 0 : 1 }}
          transition={{ duration: D.fast }}
          className="mb-4 text-center text-[12.5px] leading-[1.4] text-text-muted"
        >
          Your decision cannot be changed after submission.
        </motion.div>

        <PrimaryButton
          disabled={play.choice === null || locking}
          onClick={lockIn}
          className="h-[60px]"
        >
          {locking ? 'LOCKED' : play.choice === null ? 'CHOOSE A SIDE' : 'LOCK IT IN'}
        </PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { getCase } from '../data/cases';
import { usePlay } from '../state/PlayContext';
import { usePlayer } from '../state/PlayerContext';
import { wordCount } from '../engine/scoring';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { D, E, shake } from '../lib/motion';
import { EvidenceChips } from '../components/EvidenceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen, Title } from '../components/Screen';

const LIMIT = 60;

function counterTone(words: number): string {
  if (words > LIMIT) return '#D2665F'; // over
  if (words >= 56) return '#D3A05B'; // close
  if (words >= 45) return '#ECEDEE'; // in range
  return '#7A828B'; // plenty left
}

export function Argument() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const { dispatch } = usePlayer();
  const c = getCase(caseId);

  const [submitting, setSubmitting] = useState(false);
  const counter = useAnimationControls();
  const footerRef = useRef<HTMLDivElement>(null);
  const prevOver = useRef(0);

  const words = wordCount(play.argument);
  const over = words > LIMIT;

  // Shake on each keystroke past the limit, not once when crossing it.
  useEffect(() => {
    if (words > LIMIT && words !== prevOver.current) void counter.start(shake);
    prevOver.current = words;
  }, [words, counter]);

  /**
   * The single most likely thing to be broken on a real phone, and the one
   * DevTools will not show you: the keyboard covering the submit button.
   * visualViewport is the only reliable signal for it on iOS.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      if (document.activeElement?.tagName === 'TEXTAREA') {
        footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  if (!c) return <Screen>Case not found.</Screen>;

  const canSubmit =
    words > 0 && !over && play.choice !== null && play.selected.length === c.selectCount && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    haptic('lock');
    sound('lock');
    dispatch({
      type: 'SUBMIT_CASE',
      caseId: c.id,
      evidenceSelected: [play.selected[0], play.selected[1]],
      choice: play.choice!,
      argument: play.argument.trim(),
    });
    setTimeout(() => navigate(`/play/${c.id}/reveal`), 420);
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

      <motion.textarea
        value={play.argument}
        onChange={(e) => playDispatch({ type: 'SET_ARGUMENT', argument: e.target.value })}
        onFocus={() =>
          setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300)
        }
        spellCheck={false}
        placeholder="Write it as if the jury only reads this."
        animate={{ borderColor: over ? '#D2665F' : 'rgba(255,255,255,0.1)' }}
        transition={{ duration: D.fast }}
        className="h-[190px] w-full resize-none rounded-[14px] border bg-surface-1 p-[18px] text-[16.5px] leading-[1.5] text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      <div className="flex items-center justify-between">
        <div className="text-[12.5px] leading-none text-text-muted">
          The jury reads fast. So should you.
        </div>
        <motion.div
          animate={counter}
          className="font-mono text-[12.5px] leading-none"
          style={{ color: counterTone(words) }}
        >
          <motion.span animate={{ color: counterTone(words) }} transition={{ duration: D.fast }}>
            {words} / {LIMIT} words
          </motion.span>
        </motion.div>
      </div>

      {/* mt-auto keeps the button reachable when the keyboard shrinks the viewport */}
      <div ref={footerRef} className="mt-auto pb-6">
        <PrimaryButton disabled={!canSubmit} onClick={submit}>
          <AnimatePresence mode="wait" initial={false}>
            {submitting ? (
              <motion.span
                key="spinner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: D.fast }}
                className="flex items-center"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="block h-4 w-4 rounded-full border-2 border-surface-0/25 border-t-surface-0"
                />
              </motion.span>
            ) : (
              <motion.span
                key="label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: D.fast, ease: E.out }}
              >
                {over ? `${words - LIMIT} WORDS OVER` : 'SUBMIT ARGUMENT'}
              </motion.span>
            )}
          </AnimatePresence>
        </PrimaryButton>
      </div>
    </Screen>
  );
}

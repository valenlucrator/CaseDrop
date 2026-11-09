import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getCase, todayKey } from '../data/cases';
import { flowRedirect, usePlay } from '../state/PlayContext';
import { usePlayer } from '../state/PlayerContext';
import { playedOn } from '../state/reducer';
import { haptic } from '../lib/haptics';
import { D, E, riseItem } from '../lib/motion';
import { EvidenceRow } from '../components/EvidenceRow';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen, Stagger, StickyFooter, Title } from '../components/Screen';

export function Evidence() {
  const { caseId = '' } = useParams();
  const navigate = useNavigate();
  const { play, playDispatch } = usePlay();
  const { state } = usePlayer();
  const c = getCase(caseId);

  // Idempotent for a live session; resets one left over from another case or day.
  useEffect(() => {
    if (c) playDispatch({ type: 'BEGIN', caseId: c.id, day: todayKey() });
  }, [c, playDispatch]);

  const [shakeKeys, setShakeKeys] = useState<Record<string, number>>({});
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!c) return <Screen>Case not found.</Screen>;

  const redirect = flowRedirect('evidence', play, c, playedOn(state, c.id));
  if (redirect) return <Navigate to={redirect} replace />;

  const remaining = c.selectCount - play.selected.length;
  const done = remaining === 0;

  const onToggle = (id: string) => {
    // Opening is final — an open item stays open, so a second tap does nothing.
    if (play.selected.includes(id)) return;

    // Silent refusal reads as a bug. Say no out loud.
    if (done) {
      haptic('reject');
      setShakeKeys((k) => ({ ...k, [id]: (k[id] ?? 0) + 1 }));
      setHint(true);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(false), 2000);
      return;
    }

    haptic('select');
    playDispatch({ type: 'OPEN_EVIDENCE', id, max: c.selectCount });
  };

  return (
    <Screen pad="pb-0" className="gap-[22px]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-[9px]">
          <Title>Evidence</Title>
          <div className="text-[13.5px] leading-none text-text-secondary">
            Open {c.selectCount} of {c.evidence.length}. Once open, it stays open.
          </div>
        </div>

        {/* The counter is the feedback surface — animate the number itself. */}
        <div className="relative h-4 min-w-[72px] overflow-hidden text-right">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={done ? 'ready' : remaining}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: D.fast, ease: E.out }}
              className={`font-mono text-[13px] leading-none ${done ? 'text-accent' : 'text-text-muted'}`}
            >
              {done ? 'ready' : `${remaining} left`}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Stagger gap={0.03} className="flex flex-col gap-2.5">
        {c.evidence.map((item) => (
          <motion.div key={item.id} variants={riseItem} className="flex flex-col">
            <EvidenceRow
              item={item}
              selected={play.selected.includes(item.id)}
              lockedOut={done && !play.selected.includes(item.id)}
              shakeKey={shakeKeys[item.id] ?? 0}
              onToggle={() => onToggle(item.id)}
            />
          </motion.div>
        ))}
      </Stagger>

      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: D.fast, ease: E.out }}
            className="-mt-2 text-center text-[12.5px] text-diverge"
          >
            Two items only. The rest stay sealed.
          </motion.div>
        )}
      </AnimatePresence>

      <StickyFooter>
        <PrimaryButton disabled={!done} onClick={() => navigate(`/play/${c.id}/decision`)}>
          CONTINUE
        </PrimaryButton>
      </StickyFooter>
    </Screen>
  );
}

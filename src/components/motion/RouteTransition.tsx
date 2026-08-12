import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useRef, type ReactNode } from 'react';
import { screenVariants, type NavMode } from '../../lib/motion';

export const TAB_ROUTES = ['/', '/jury', '/learn', '/community', '/profile'];

/**
 * One shared transition for the whole router, not per-screen bespoke
 * animation. Tabs crossfade because they are peers — sliding between them
 * would imply a sequence that does not exist.
 *
 * The mode is passed through AnimatePresence `custom`, which is what lets the
 * *outgoing* screen animate with the direction of the current navigation
 * rather than the one that brought it in.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const prev = useRef<string>(location.pathname);
  const first = useRef(true);

  const from = prev.current;
  const to = location.pathname;

  let mode: NavMode = 'forward';
  if (first.current) mode = 'fade'; // cold open shouldn't slide in from nowhere
  else if (TAB_ROUTES.includes(from) && TAB_ROUTES.includes(to)) mode = 'fade';
  else if (navType === 'POP') mode = 'back';

  prev.current = to;
  first.current = false;

  /*
   * `initial` is deliberately NOT false here. AnimatePresence propagates
   * initial={false} to its whole subtree, which silently kills every
   * mount-time entrance on the first screen rendered — the staggers, the
   * delayed CTA, the card scale-in. Only state-triggered animation survives
   * it, which is exactly the kind of bug that looks like "motion didn't work
   * on some screens".
   */
  return (
    <AnimatePresence mode="wait" custom={mode}>
      <motion.div
        key={location.pathname}
        custom={mode}
        variants={screenVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

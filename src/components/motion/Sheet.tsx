import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { D, E } from '../../lib/motion';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Nearest scrollable ancestor — the screen's scroll container. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Peek sheet from the bottom. Used for re-reading evidence mid-commit and for
 * Learn entries: both must return the reader to exactly where they were, so
 * this overlays rather than navigates.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const anchor = useRef<HTMLDivElement>(null);
  const saved = useRef<{ el: HTMLElement; top: number } | null>(null);

  /*
   * Opening a sheet must not cost the reader their place. Focus moves and
   * layout shifts can both nudge the scroll container, so the position is
   * captured on open and restored on close — the guarantee has to hold
   * whatever caused the drift.
   */
  useEffect(() => {
    if (open) {
      const el = scrollParent(anchor.current);
      if (el) saved.current = { el, top: el.scrollTop };
      return;
    }
    const s = saved.current;
    if (s) {
      s.el.scrollTop = s.top;
      saved.current = null;
    }
  }, [open]);

  return (
    <>
      <div ref={anchor} className="hidden" aria-hidden />
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: D.fast }}
              onClick={onClose}
              className="absolute inset-0 z-40 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: D.base, ease: E.out }}
              className="absolute inset-x-0 bottom-0 z-50 max-h-[70%] overflow-y-auto rounded-t-[20px] border-t border-border-strong bg-surface-1 px-[22px] pt-4 pb-10"
            >
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-surface-3" />
              {title && <div className="meta mb-3 text-text-muted">{title}</div>}
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

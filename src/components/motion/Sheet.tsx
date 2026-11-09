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
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // Callers pass an inline arrow; a ref keeps the effect below keyed on `open` alone.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  /*
   * Keyboard and screen-reader users: focus moves into the sheet on open
   * (preventScroll, so the scroll guarantee below still holds), Escape
   * closes it, and focus goes back to the chip that opened it.
   */
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener.current?.focus({ preventScroll: true });
    };
  }, [open]);

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
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: D.base, ease: E.out }}
              className="absolute inset-x-0 bottom-0 z-50 max-h-[70%] overflow-y-auto rounded-t-[20px] border-t border-border-strong bg-surface-1 px-[22px] pt-4 pb-10 outline-none"
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

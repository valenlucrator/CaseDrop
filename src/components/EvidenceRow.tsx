import { useEffect } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { EvidenceItem } from '../types/case';
import { D, E, shake } from '../lib/motion';

interface Props {
  item: EvidenceItem;
  selected: boolean;
  /** Selection is complete and this item was not chosen — it is gone. */
  lockedOut?: boolean;
  /** Increment to trigger the refusal shake. */
  shakeKey?: number;
  onToggle?: () => void;
}

export function EvidenceRow({ item, selected, lockedOut = false, shakeKey = 0, onToggle }: Props) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (shakeKey > 0) void controls.start(shake);
  }, [shakeKey, controls]);

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      animate={controls}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: D.instant, ease: E.out }}
      className={`flex flex-col gap-[9px] rounded-[14px] border p-[16px_17px] text-left ${
        selected ? 'border-accent bg-surface-2' : 'border-border-strong bg-surface-1'
      }`}
      // The three you gave up should be visible. This is the mechanic.
      style={{ opacity: lockedOut ? 0.35 : 1, transition: `opacity ${D.base}s` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-[14.5px] font-semibold uppercase tracking-[0.02em]">
          {item.label}
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {lockedOut && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: D.fast, ease: E.out }}
                className="text-text-faint"
              >
                <Lock size={12} strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
          <motion.div
            animate={{
              backgroundColor: selected ? 'var(--color-accent)' : 'rgba(0,0,0,0)',
              borderColor: selected ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
            }}
            transition={{ duration: D.fast, ease: E.out }}
            className="h-[15px] w-[15px] shrink-0 rounded-[4px] border"
          />
        </div>
      </div>

      {/* The teaser never reveals the payload — the choice has to be a real one. */}
      <div className="text-[13px] leading-[1.45] text-text-secondary">{item.teaser}</div>

      {/* Expands in place. Reading an item must never navigate away. */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: D.base, ease: E.out }}
            className="overflow-hidden"
          >
            <div className="mt-[5px] border-t border-white/8 pt-3 text-[13.5px] leading-[1.5] whitespace-pre-line text-text-body">
              {item.body}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

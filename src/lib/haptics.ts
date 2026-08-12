type Pattern = 'tap' | 'select' | 'lock' | 'reject' | 'reveal' | 'result';

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  select: 12,
  lock: [18, 40, 28],
  reject: [10, 30, 10],
  reveal: 14,
  result: [24, 60, 40],
};

let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

/**
 * Fires on Android (Chrome). `navigator.vibrate` does not exist in Safari on
 * iOS and there is no shim for it — so on iPhone this is a silent no-op and
 * the visual press response carries the entire tactile channel. That is why
 * `press` is applied to every interactive element rather than being garnish.
 */
export function haptic(p: Pattern) {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(PATTERNS[p]);
  } catch {
    /* no-op */
  }
}

/** True only where the setting would actually do something. Hide the toggle otherwise. */
export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

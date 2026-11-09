import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Side } from '../types/case';

/**
 * In-session flow state: which evidence is open, what was chosen, the draft
 * argument. Deliberately NOT part of PlayerState — the stored schema stays
 * exactly as specified.
 *
 * It IS mirrored to sessionStorage (per tab, gone when the tab closes). iOS
 * Safari reloads backgrounded tabs freely, and a reload that forgets which
 * evidence was opened strands the player on a submit button that can never
 * enable — and re-seals all five items, which turns "choose 2 of 5" into
 * "refresh to read the rest".
 */
export interface PlayState {
  caseId: string | null;
  /** Local day the session began. A session from another day is stale. */
  day: string | null;
  selected: string[];
  choice: Side | null;
  argument: string;
}

export type PlayAction =
  | { type: 'BEGIN'; caseId: string; day: string }
  | { type: 'OPEN_EVIDENCE'; id: string; max: number }
  | { type: 'SET_CHOICE'; choice: Side }
  | { type: 'SET_ARGUMENT'; argument: string }
  | { type: 'RESET' };

export const emptyPlay: PlayState = { caseId: null, day: null, selected: [], choice: null, argument: '' };

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'BEGIN':
      return state.caseId === action.caseId && state.day === action.day
        ? state
        : { ...emptyPlay, caseId: action.caseId, day: action.day };
    case 'OPEN_EVIDENCE': {
      // Opening is final. If an opened item could be closed again, the player
      // could read all five one pair at a time and "the rest stay sealed"
      // would be a lie.
      if (state.selected.includes(action.id)) return state;
      if (state.selected.length >= action.max) return state;
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SET_CHOICE':
      return { ...state, choice: action.choice };
    case 'SET_ARGUMENT':
      return { ...state, argument: action.argument };
    case 'RESET':
      return emptyPlay;
    default:
      return state;
  }
}

export type FlowStep = 'intro' | 'evidence' | 'decision' | 'argument';

/**
 * Where a play-flow screen should send the player instead of rendering, or
 * null to render. Pure so it can be tested without a router.
 *
 * - Already submitted today → that play's result. Covers Back from the reveal.
 * - A step whose prerequisites are missing (deep link, new tab) → the
 *   earliest step that is not done, never a screen that cannot complete.
 */
export function flowRedirect(
  step: FlowStep,
  play: PlayState,
  c: { id: string; selectCount: number },
  submittedToday: { playedAt: string } | undefined,
): string | null {
  if (submittedToday) return `/result/${c.id}?at=${encodeURIComponent(submittedToday.playedAt)}`;
  if (step === 'intro' || step === 'evidence') return null;
  const ownSession = play.caseId === c.id;
  if (!ownSession || play.selected.length < c.selectCount) return `/play/${c.id}/evidence`;
  if (step === 'argument' && play.choice === null) return `/play/${c.id}/decision`;
  return null;
}

const STORE_KEY = 'casedrop:play';

function loadPlay(): PlayState {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return emptyPlay;
    const p = JSON.parse(raw) as Partial<PlayState>;
    return {
      caseId: typeof p.caseId === 'string' ? p.caseId : null,
      day: typeof p.day === 'string' ? p.day : null,
      selected: Array.isArray(p.selected) ? p.selected.filter((x): x is string => typeof x === 'string') : [],
      choice: p.choice === 'a' || p.choice === 'b' ? p.choice : null,
      argument: typeof p.argument === 'string' ? p.argument : '',
    };
  } catch {
    return emptyPlay;
  }
}

const PlayContext = createContext<{
  play: PlayState;
  playDispatch: React.Dispatch<PlayAction>;
} | null>(null);

export function PlayProvider({ children }: { children: ReactNode }) {
  const [play, playDispatch] = useReducer(playReducer, undefined, loadPlay);

  useEffect(() => {
    try {
      if (play.caseId === null) sessionStorage.removeItem(STORE_KEY);
      else sessionStorage.setItem(STORE_KEY, JSON.stringify(play));
    } catch {
      // Private mode / quota. The session still works; it just won't survive a reload.
    }
  }, [play]);

  const value = useMemo(() => ({ play, playDispatch }), [play]);
  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
}

export function usePlay() {
  const ctx = useContext(PlayContext);
  if (!ctx) throw new Error('usePlay must be used inside <PlayProvider>');
  return ctx;
}

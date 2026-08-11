import { createContext, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Side } from '../types/case';

/**
 * In-session flow state: which evidence is open, what was chosen, the draft
 * argument. Deliberately NOT persisted — a three-minute session does not
 * need crash recovery, and keeping it out of PlayerState leaves the stored
 * schema exactly as specified.
 */
interface PlayState {
  caseId: string | null;
  selected: string[];
  choice: Side | null;
  argument: string;
}

type PlayAction =
  | { type: 'BEGIN'; caseId: string }
  | { type: 'TOGGLE_EVIDENCE'; id: string; max: number }
  | { type: 'SET_CHOICE'; choice: Side }
  | { type: 'SET_ARGUMENT'; argument: string }
  | { type: 'RESET' };

const empty: PlayState = { caseId: null, selected: [], choice: null, argument: '' };

function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'BEGIN':
      return state.caseId === action.caseId ? state : { ...empty, caseId: action.caseId };
    case 'TOGGLE_EVIDENCE': {
      if (state.selected.includes(action.id)) {
        return { ...state, selected: state.selected.filter((x) => x !== action.id) };
      }
      // Silently ignoring the tap past the limit is the correct feel here:
      // the counter already says how many are left.
      if (state.selected.length >= action.max) return state;
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'SET_CHOICE':
      return { ...state, choice: action.choice };
    case 'SET_ARGUMENT':
      return { ...state, argument: action.argument };
    case 'RESET':
      return empty;
    default:
      return state;
  }
}

const PlayContext = createContext<{
  play: PlayState;
  playDispatch: React.Dispatch<PlayAction>;
} | null>(null);

export function PlayProvider({ children }: { children: ReactNode }) {
  const [play, playDispatch] = useReducer(playReducer, empty);
  const value = useMemo(() => ({ play, playDispatch }), [play]);
  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
}

export function usePlay() {
  const ctx = useContext(PlayContext);
  if (!ctx) throw new Error('usePlay must be used inside <PlayProvider>');
  return ctx;
}

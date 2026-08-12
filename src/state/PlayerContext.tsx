import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { PlayerState } from '../types/player';
import { reducer, type Action } from './reducer';
import { load, save } from './storage';

interface PlayerContextValue {
  state: PlayerState;
  dispatch: React.Dispatch<Action>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  // Judge anything that has come due. Runs on mount — the result is waiting
  // when the player comes back, it does not arrive while they watch.
  useEffect(() => {
    dispatch({ type: 'JUDGE_PENDING' });
    const id = setInterval(() => dispatch({ type: 'JUDGE_PENDING' }), 15_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'JUDGE_PENDING' });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // A few KB on every change. Debouncing this is premature.
  useEffect(() => {
    save(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}

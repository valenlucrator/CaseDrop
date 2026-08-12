import { createContext, useContext } from 'react';
import { GATES, type PopulationStats, EMPTY_POPULATION } from '../engine/population';

export const FEATURES = {
  accounts: false,
  cloudSync: false,
  rating: false,
  liveOpponents: false,
  liveJury: false,
  learn: false,
  community: false,
  sundayTrial: false,
} as const;

export type Feature = keyof typeof FEATURES;

/** Features whose availability is decided by population, not by a switch. */
const GATED: Partial<Record<Feature, keyof typeof GATES>> = {
  liveOpponents: 'liveOpponents',
  rating: 'rating',
  liveJury: 'liveJury',
};

export const PopulationContext = createContext<PopulationStats>(EMPTY_POPULATION);

const OVERRIDE_KEY = 'casedrop:ff';

/**
 * `?ff=rating,learn` turns flags on for a session — for testing only.
 *
 * Persisted to sessionStorage on first sight because in-app navigation drops
 * the query string: without this, the override dies the moment you tap a tab
 * and the feature you just enabled vanishes.
 */
function queryOverrides(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = new URLSearchParams(window.location.search).get('ff');
    if (raw !== null) sessionStorage.setItem(OVERRIDE_KEY, raw);
    const stored = sessionStorage.getItem(OVERRIDE_KEY) ?? '';
    return new Set(
      stored
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export function isGateMet(feature: Feature, stats: PopulationStats): boolean {
  const gate = GATED[feature];
  if (!gate) return true;
  return stats[gate] >= GATES[gate];
}

/**
 * A manual flag can only *disable* a feature, never force-enable it past its
 * population gate. That asymmetry is the guard against a fake ladder: no
 * amount of config turns rating on for eleven players.
 */
export function useFeature(feature: Feature): boolean {
  const stats = useContext(PopulationContext);
  const flagged = FEATURES[feature] || queryOverrides().has(feature);
  return flagged && isGateMet(feature, stats);
}

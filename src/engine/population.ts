/**
 * The cold-start gate. Every count in the mockups (4,821 players today,
 * 147 jurors voted) reads as 11, 3 and 11 in week one. Below the threshold
 * we show "You're early" rather than announcing that the app is empty.
 */
export const POPULATION_THRESHOLD = 50;

/** Live pairing against real players. Superseded by FEATURES.liveOpponents. */
export const LIVE_PAIRING = false;

/**
 * Thresholds a feature must clear before it can turn on at all. These are
 * about honesty, not caution: pairing live below 20 submissions per case
 * means duels against whoever happened to be awake, and a rating built on
 * that is a number pretending to be a measurement.
 */
export const GATES = {
  liveOpponents: 20, // live submissions per case
  rating: 50, // players with ≥3 submissions
  liveJury: 30, // jury votes available per pair
} as const;

export interface PopulationStats {
  liveOpponents: number;
  rating: number;
  liveJury: number;
}

export const EMPTY_POPULATION: PopulationStats = {
  liveOpponents: 0,
  rating: 0,
  liveJury: 0,
};

/**
 * The population count every screen shows until a backend reports a real
 * one. There is no source for it in v1, so it is zero — which renders
 * "You're early". It must never be derived from the local player's own
 * activity: that is a fabricated crowd that crosses the threshold and starts
 * printing raw numbers after a couple of weeks of solo play.
 */
export const KNOWN_PLAYERS_TODAY = 0;

export function isEarly(count: number): boolean {
  return count < POPULATION_THRESHOLD;
}

export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}

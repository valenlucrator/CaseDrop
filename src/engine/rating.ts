import { LIVE_PAIRING } from './population';

/**
 * Elo, gated off in v1.
 *
 * `PlayerState.rating` stays null until the population gate opens, and the
 * Profile screen reads `rating === null` to render the streak/accuracy view
 * instead of a ladder. Nothing here runs while RATING_ENABLED is false —
 * it exists so that turning the ladder on is one flag, not a refactor.
 *
 * Rating is never attached to an archive match. Beating a seed argument is
 * not beating a player, and pretending otherwise poisons the number before
 * it means anything.
 */
export const RATING_ENABLED = LIVE_PAIRING;

export const STARTING_RATING = 1200;
export const K_FACTOR = 24;

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - player) / 400));
}

/** outcome: 1 win, 0.5 draw, 0 loss. */
export function nextRating(player: number, opponent: number, outcome: number, k = K_FACTOR): number {
  return Math.round(player + k * (outcome - expectedScore(player, opponent)));
}

/**
 * The only entry point the app should call. Returns the rating unchanged
 * (and null stays null) while the gate is closed.
 */
export function applyResult(
  current: number | null,
  opponentRating: number,
  outcome: number,
): number | null {
  if (!RATING_ENABLED || current === null) return current;
  return nextRating(current, opponentRating, outcome);
}

/** Rank labels, for when the ladder turns on. Unused in v1 by design. */
export function rankFor(rating: number | null): string | null {
  if (!RATING_ENABLED || rating === null) return null;
  if (rating < 1100) return 'Trainee';
  if (rating < 1300) return 'Associate I';
  if (rating < 1450) return 'Associate II';
  if (rating < 1600) return 'Associate III';
  if (rating < 1800) return 'Senior Associate';
  return 'Partner';
}

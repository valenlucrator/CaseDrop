/**
 * Elo, dormant until the population gate opens.
 *
 * `PlayerState.rating` stays null until then, and Profile branches on that to
 * render streak/accuracy instead of a ladder. Nothing here runs while the
 * gate is shut — it exists so that turning the ladder on is a flag, not a
 * refactor.
 *
 * Rating never accrues from an archive match. Beating a seed argument is not
 * beating a player, and pretending otherwise poisons the number before it
 * means anything.
 */

export const STARTING_RATING = 1200;

/** Wider swings while the estimate is young, then settle. */
export const K_EARLY = 32;
export const K_LATE = 16;
export const K_SWITCH_AT = 20;

/** Rating is hidden behind "Placing…" until the estimate means something. */
export const PLACEMENT_MATCHES = 5;

/** A ladder with nobody on it is just a mirror. */
export const LEADERBOARD_MIN_PLAYERS = 30;

export function kFactor(ratedMatches: number): number {
  return ratedMatches < K_SWITCH_AT ? K_EARLY : K_LATE;
}

export function expectedScore(player: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - player) / 400));
}

/** outcome: 1 win, 0.5 draw, 0 loss. */
export function nextRating(player: number, opponent: number, outcome: number, k = K_EARLY): number {
  return Math.round(player + k * (outcome - expectedScore(player, opponent)));
}

export interface RatedResult {
  rating: number | null;
  ratedMatches: number;
  delta: number | null;
}

/**
 * The only entry point the app should call.
 *
 * `live` is the archive/live distinction — an archive match returns the
 * rating untouched and a null delta, so the result screen can show an
 * outcome without inventing a ladder movement.
 */
export function applyResult(
  current: number | null,
  ratedMatches: number,
  opponentRating: number,
  outcome: number,
  opts: { enabled: boolean; live: boolean },
): RatedResult {
  if (!opts.enabled || !opts.live) return { rating: current, ratedMatches, delta: null };

  const from = current ?? STARTING_RATING;
  const to = nextRating(from, opponentRating, outcome, kFactor(ratedMatches));
  return { rating: to, ratedMatches: ratedMatches + 1, delta: to - from };
}

// ---- ranks -----------------------------------------------------------------

interface Band {
  name: string;
  min: number;
  max: number | null; // null = open-ended top band
}

const BANDS: Band[] = [
  { name: 'Law Student', min: 0, max: 999 },
  { name: 'Legal Intern', min: 1000, max: 1299 },
  { name: 'Associate', min: 1300, max: 1599 },
  { name: 'Senior Associate', min: 1600, max: 1949 },
  { name: 'Counsel', min: 1950, max: 2199 },
  { name: 'Partner', min: 2200, max: null },
];

const DIVISIONS = ['III', 'II', 'I']; // III is the entry division

export function bandFor(rating: number): Band {
  return BANDS.find((b) => rating >= b.min && (b.max === null || rating <= b.max)) ?? BANDS[0];
}

/**
 * Three evenly-split divisions per band. The open-ended top band has none —
 * "Partner II" would imply a ceiling that does not exist.
 */
export function rankFor(rating: number | null, ratedMatches = Infinity): string | null {
  if (rating === null) return null;
  if (ratedMatches < PLACEMENT_MATCHES) return 'Placing…';

  const band = bandFor(rating);
  if (band.max === null) return band.name;

  const width = (band.max + 1 - band.min) / DIVISIONS.length;
  const index = Math.min(DIVISIONS.length - 1, Math.floor((rating - band.min) / width));
  return `${band.name} ${DIVISIONS[index]}`;
}

export function isPlacing(rating: number | null, ratedMatches: number): boolean {
  return rating !== null && ratedMatches < PLACEMENT_MATCHES;
}

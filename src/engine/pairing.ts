import type { Case, Side } from '../types/case';
import type { JuryResult, Submission } from '../types/player';
import { argumentQuality } from './scoring';
import { LIVE_PAIRING } from './population';
import archive from '../data/archive/seed-arguments.json';

export interface SeedArgument {
  id: string;
  caseId: string;
  side: Side;
  evidenceSeen: string[];
  author: string;
  quality: 'sharp' | 'flawed' | 'generic';
  strength: number; // 0..1
  text: string;
}

export const seedArguments = archive as SeedArgument[];

/** Deterministic 32-bit hash — the same submission must always judge the same way. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function overlap(a: string[], b: readonly string[]): number {
  return a.filter((x) => b.includes(x)).length;
}

/**
 * Serve an archive argument matched on the same evidence pair. Preference
 * order: opposite side + identical pair, then opposite side + one shared
 * item, then opposite side, then anything. An opponent who saw what you saw
 * makes the comparison mean something.
 */
export function findOpponent(
  caseId: string,
  evidenceSelected: readonly string[],
  choice: Side,
  excludeIds: string[] = [],
): SeedArgument | undefined {
  const pool = seedArguments.filter((a) => a.caseId === caseId && !excludeIds.includes(a.id));
  if (!pool.length) return undefined;

  const other: Side = choice === 'a' ? 'b' : 'a';
  const rank = (a: SeedArgument) => {
    const sideScore = a.side === other ? 100 : 0;
    return sideScore + overlap(a.evidenceSeen, evidenceSelected) * 10;
  };

  const sorted = [...pool].sort((x, y) => rank(y) - rank(x));
  const best = rank(sorted[0]);
  const tied = sorted.filter((a) => rank(a) === best);
  return tied[hash(caseId + evidenceSelected.join('') + choice) % tied.length];
}

/**
 * Simulate the jury. Deterministic from the submission so a result never
 * changes between renders or reloads.
 *
 * Note this is the one place bots are doing work the blueprint accepts:
 * the *verdict* is simulated, the opposing *prose* never is.
 */
export function simulateJury(
  c: Case,
  s: Pick<Submission, 'evidenceSelected' | 'argument'>,
  opponent: SeedArgument,
): JuryResult {
  const seed = hash(c.id + s.argument + opponent.id);
  const quality = argumentQuality(c, s);

  // Jurors are scarce in week one, and the count is honest about it.
  const jurors = 7 + (seed % 7);

  const edge = (quality - opponent.strength) * 55;
  const jitter = ((seed >>> 8) % 9) - 4;
  const pct = Math.max(18, Math.min(84, 50 + edge + jitter));

  const yoursVotes = Math.max(0, Math.min(jurors, Math.round((pct / 100) * jurors)));
  const yours = Math.round((yoursVotes / jurors) * 100);

  return { yours, theirs: 100 - yours, jurors };
}

/**
 * How long a submission sits pending before the result is available.
 *
 * The delay IS the return hook — the whole async design exists to make the
 * player come back to something. Three hours is the floor for anything sent
 * to a tester. Set VITE_JUDGING_DELAY_MS=20000 locally when you need to walk
 * the full loop in one sitting; it is a dev override, not a build setting.
 */
/** What any built artefact uses. This is the number that ships. */
export const JUDGING_DELAY_FLOOR_MS = 3 * 60 * 60 * 1000;

const DEV_OVERRIDE_MS = Number(import.meta.env.VITE_JUDGING_DELAY_MS) || 0;
const OVERRIDE_ACTIVE = Boolean(import.meta.env.DEV) && DEV_OVERRIDE_MS > 0;

export const JUDGING_DELAY_MS = OVERRIDE_ACTIVE ? DEV_OVERRIDE_MS : JUDGING_DELAY_FLOOR_MS;

/** True only in a dev session that has opted into a shortened loop. */
export const JUDGING_DELAY_IS_OVERRIDDEN = OVERRIDE_ACTIVE;

export function isReadyToJudge(playedAt: string, now: number = Date.now()): boolean {
  return now - new Date(playedAt).getTime() >= JUDGING_DELAY_MS;
}

// ---- source switch ---------------------------------------------------------

export type OpponentSource = 'archive' | 'live';

/**
 * Below the gate, opponents come from the hand-written archive. Above it,
 * from real submissions — but still matched on the same evidence pair. That
 * constraint does not relax when live players arrive: a duel is only
 * meaningful if both sides saw the same information.
 */
export function opponentSource(liveEnabled: boolean): OpponentSource {
  return liveEnabled && LIVE_PAIRING ? 'live' : 'archive';
}

/** Archive matches are labelled honestly and never touch rating. */
export function isRated(source: OpponentSource): boolean {
  return source === 'live';
}

export function sourceLabel(source: OpponentSource): string | null {
  return source === 'archive' ? 'Compared against the case archive' : null;
}

/**
 * The community split, jittered ±3 so the number is not suspiciously round —
 * but deterministic per case, because every player on a given day has to see
 * the same figure or the split means nothing.
 */
export function communitySplit(c: Case): { a: number; b: number } {
  const jitter = (hash(`split:${c.id}`) % 7) - 3;
  const a = Math.max(0, Math.min(100, c.simulatedSplit.a + jitter));
  return { a, b: 100 - a };
}

// ---- serving on someone else's jury ---------------------------------------

export interface JuryPair {
  key: string;
  caseId: string;
  a: SeedArgument;
  b: SeedArgument;
}

/**
 * Pairs the player votes on. Both arguments come from the archive and are
 * labelled honestly in the UI as such — no argument here was generated.
 */
export function juryPairs(caseIds?: string[]): JuryPair[] {
  const ids = caseIds?.length ? caseIds : [...new Set(seedArguments.map((s) => s.caseId))];
  const pairs: JuryPair[] = [];

  for (const caseId of ids) {
    const pool = seedArguments.filter((s) => s.caseId === caseId);
    const sideA = pool.filter((s) => s.side === 'a');
    const sideB = pool.filter((s) => s.side === 'b');
    for (const a of sideA) {
      for (const b of sideB) {
        pairs.push({ key: `${caseId}:${a.id}:${b.id}`, caseId, a, b });
      }
    }
  }

  // Stable shuffle: same order every session, no favouritism toward index 0.
  return pairs.sort((x, y) => (hash(x.key) % 1000) - (hash(y.key) % 1000));
}

/** How the rest of the jury split on this pair. Deterministic per pair. */
export function juryPairSplit(pair: JuryPair): { a: number; b: number; jurors: number } {
  const seed = hash(pair.key);
  const jurors = 9 + (seed % 8);
  const edge = (pair.a.strength - pair.b.strength) * 60;
  const jitter = ((seed >>> 8) % 9) - 4;
  const pct = Math.max(20, Math.min(80, 50 + edge + jitter));
  const aVotes = Math.max(0, Math.min(jurors, Math.round((pct / 100) * jurors)));
  const a = Math.round((aVotes / jurors) * 100);
  return { a, b: 100 - a, jurors };
}

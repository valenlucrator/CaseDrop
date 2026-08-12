import type { PlayerState } from '../types/player';

const KEY = 'casedrop:v1';
const VERSION = 1 as const;

export function freshState(now: Date = new Date()): PlayerState {
  return {
    version: VERSION,
    createdAt: now.toISOString(),
    streak: 0,
    lastPlayedDate: null,
    casesCompleted: 0,
    benchmarkAgreement: { agreed: 0, total: 0 },
    juryRecord: { won: 0, lost: 0 },
    submissions: [],
    juryVotes: [],
    juryVotesCast: 0,
    rating: null, // stays null until the population gate opens
  };
}

/**
 * A stub with a real job: it exists so that the first schema change does not
 * wipe testers. When version 2 arrives, add a branch here rather than
 * bumping KEY.
 */
export function migrate(raw: unknown): PlayerState {
  if (!raw || typeof raw !== 'object') return freshState();
  const candidate = raw as Partial<PlayerState>;
  if (candidate.version !== VERSION) return freshState();

  // Fill anything a partial write left missing rather than discarding the lot.
  return { ...freshState(), ...candidate, version: VERSION };
}

export function load(): PlayerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    return migrate(JSON.parse(raw));
  } catch {
    return freshState();
  }
}

export function save(state: PlayerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota. Losing progress beats crashing the app.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

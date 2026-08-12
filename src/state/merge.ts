import type { PlayerState, Submission } from '../types/player';
import { getCase } from '../data/cases';

const RANK: Record<Submission['status'], number> = { pending: 0, judged: 1, seen: 2 };

/**
 * Which of two records of the same play is the truer one. Newer `playedAt`
 * wins; on a tie the more advanced status does, because a submission that
 * has been judged server-side carries a result the local copy does not.
 */
function betterOf(a: Submission, b: Submission): Submission {
  const ta = new Date(a.playedAt).getTime();
  const tb = new Date(b.playedAt).getTime();
  if (ta !== tb) return ta > tb ? a : b;
  if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] > RANK[b.status] ? a : b;
  return a.juryResult && !b.juryResult ? a : b;
}

/**
 * Merge a local state into a remote one. Never clobbers: every submission
 * present on either side survives, and the aggregate counters are *derived*
 * from the merged set rather than summed — summing is how a sync ends up
 * claiming 14 cases played when the player played 7.
 */
export function mergeStates(local: PlayerState, remote: PlayerState): PlayerState {
  const byCase = new Map<string, Submission>();
  for (const s of [...remote.submissions, ...local.submissions]) {
    const existing = byCase.get(s.caseId);
    byCase.set(s.caseId, existing ? betterOf(existing, s) : s);
  }

  const submissions = [...byCase.values()].sort(
    (x, y) => new Date(y.playedAt).getTime() - new Date(x.playedAt).getTime(),
  );

  const juryVotes = [...remote.juryVotes];
  const seenPairs = new Set(juryVotes.map((v) => v.pairKey));
  for (const v of local.juryVotes) {
    if (!seenPairs.has(v.pairKey)) {
      juryVotes.push(v);
      seenPairs.add(v.pairKey);
    }
  }

  let won = 0;
  let lost = 0;
  let agreed = 0;
  let decided = 0;
  for (const s of submissions) {
    if (s.juryResult) {
      if (s.juryResult.yours > s.juryResult.theirs) won++;
      else lost++;
    }
    const favored = getCase(s.caseId)?.benchmark.favored ?? null;
    if (favored !== null) {
      decided++;
      if (s.choice === favored) agreed++;
    }
  }

  const lastPlayed = [local.lastPlayedDate, remote.lastPlayedDate]
    .filter((d): d is string => d !== null)
    .sort()
    .pop() ?? null;

  return {
    version: 1,
    createdAt: local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt,
    // Settings are a property of the person, but the device they just
    // touched is the better guess at what they meant.
    settings: local.settings,
    streak: Math.max(local.streak, remote.streak),
    lastPlayedDate: lastPlayed,
    casesCompleted: submissions.length,
    benchmarkAgreement: { agreed, total: decided },
    juryRecord: { won, lost },
    submissions,
    juryVotes,
    juryVotesCast: juryVotes.length,
    // The server owns rating: it is the only side that can see live pairs.
    rating: remote.rating ?? local.rating,
    ratedMatches: Math.max(local.ratedMatches, remote.ratedMatches),
  };
}

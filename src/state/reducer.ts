import type { Side } from '../types/case';
import type { PlayerState, Submission } from '../types/player';
import { getCase, todayKey } from '../data/cases';
import { findOpponent, isReadyToJudge, simulateJury } from '../engine/pairing';
import { scoreSubmission } from '../engine/scoring';
import { freshState } from './storage';

export type Action =
  | {
      type: 'SUBMIT_CASE';
      caseId: string;
      evidenceSelected: [string, string];
      choice: Side;
      argument: string;
      now?: Date;
    }
  | { type: 'JUDGE_PENDING'; now?: number }
  | { type: 'MARK_SEEN'; caseId: string }
  | { type: 'CAST_JURY_VOTE'; caseId: string; pairKey: string; votedFor: 'a' | 'b' }
  | { type: 'RESET' };

function yesterdayOf(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return todayKey(dt);
}

function nextStreak(state: PlayerState, today: string): number {
  if (state.lastPlayedDate === today) return state.streak;
  if (state.lastPlayedDate === yesterdayOf(today)) return state.streak + 1;
  return 1;
}

export function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'SUBMIT_CASE': {
      const now = action.now ?? new Date();
      const today = todayKey(now);
      const c = getCase(action.caseId);

      const submission: Submission = {
        caseId: action.caseId,
        playedAt: now.toISOString(),
        evidenceSelected: action.evidenceSelected,
        choice: action.choice,
        argument: action.argument,
        status: 'pending',
      };

      // Benchmark agreement only counts where the benchmark actually took a
      // side. A genuinely split case has no right answer to agree with.
      const favored = c?.benchmark.favored ?? null;
      const agreement =
        favored === null
          ? state.benchmarkAgreement
          : {
              agreed: state.benchmarkAgreement.agreed + (action.choice === favored ? 1 : 0),
              total: state.benchmarkAgreement.total + 1,
            };

      return {
        ...state,
        streak: nextStreak(state, today),
        lastPlayedDate: today,
        casesCompleted: state.casesCompleted + 1,
        benchmarkAgreement: agreement,
        submissions: [submission, ...state.submissions],
      };
    }

    /**
     * pending → judged. This is the transition the whole async structure
     * hangs off: it happens on app load, never at the end of the session,
     * so the player closes the app with their record unchanged.
     */
    case 'JUDGE_PENDING': {
      const now = action.now ?? Date.now();
      let won = 0;
      let lost = 0;
      let changed = false;

      const submissions = state.submissions.map((s) => {
        if (s.status !== 'pending' || !isReadyToJudge(s.playedAt, now)) return s;
        const c = getCase(s.caseId);
        if (!c) return s;

        const opponent = findOpponent(s.caseId, s.evidenceSelected, s.choice);
        if (!opponent) return s;

        const juryResult = simulateJury(c, s, opponent);
        const score = scoreSubmission(c, s, juryResult);
        changed = true;
        if (juryResult.yours > juryResult.theirs) won++;
        else lost++;

        return {
          ...s,
          status: 'judged' as const,
          opponentArgumentId: opponent.id,
          juryResult,
          score,
        };
      });

      if (!changed) return state;

      return {
        ...state,
        submissions,
        juryRecord: {
          won: state.juryRecord.won + won,
          lost: state.juryRecord.lost + lost,
        },
        // rating stays null — archive matches never touch it (§8).
        rating: state.rating,
      };
    }

    case 'MARK_SEEN': {
      let changed = false;
      const submissions = state.submissions.map((s) => {
        if (s.caseId !== action.caseId || s.status !== 'judged') return s;
        changed = true;
        return { ...s, status: 'seen' as const };
      });
      return changed ? { ...state, submissions } : state;
    }

    case 'CAST_JURY_VOTE': {
      if (state.juryVotes.some((v) => v.pairKey === action.pairKey)) return state;
      return {
        ...state,
        juryVotesCast: state.juryVotesCast + 1,
        juryVotes: [
          {
            caseId: action.caseId,
            pairKey: action.pairKey,
            votedFor: action.votedFor,
            votedAt: new Date().toISOString(),
          },
          ...state.juryVotes,
        ],
      };
    }

    case 'RESET':
      return freshState();

    default:
      return state;
  }
}

// ---- selectors -------------------------------------------------------------

export function submissionFor(state: PlayerState, caseId: string): Submission | undefined {
  return state.submissions.find((s) => s.caseId === caseId);
}

export function hasPlayed(state: PlayerState, caseId: string): boolean {
  return state.submissions.some((s) => s.caseId === caseId);
}

/** Judged but not yet opened — this is what puts the badge on Home. */
export function pendingResults(state: PlayerState): Submission[] {
  return state.submissions.filter((s) => s.status === 'judged');
}

export function awaitingVerdict(state: PlayerState): Submission[] {
  return state.submissions.filter((s) => s.status === 'pending');
}

export function accuracy(state: PlayerState): number | null {
  const { agreed, total } = state.benchmarkAgreement;
  return total === 0 ? null : Math.round((agreed / total) * 100);
}

export function juryWinRate(state: PlayerState): number | null {
  const { won, lost } = state.juryRecord;
  return won + lost === 0 ? null : Math.round((won / (won + lost)) * 100);
}

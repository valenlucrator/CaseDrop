import type { Side } from '../types/case';
import type { PlayerState, Submission } from '../types/player';
import { getCase, todayKey } from '../data/cases';
import { findOpponent, isRated, isReadyToJudge, opponentSource, simulateJury } from '../engine/pairing';
import { applyResult, STARTING_RATING } from '../engine/rating';
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
  /** playedAt narrows to one play; without it every judged play of the case is cleared. */
  | { type: 'MARK_SEEN'; caseId: string; playedAt?: string }
  | { type: 'CAST_JURY_VOTE'; caseId: string; pairKey: string; votedFor: 'a' | 'b' }
  | { type: 'SET_SETTING'; key: keyof PlayerState['settings']; value: boolean }
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

      // One submission per case per day. The rotation repeats cases every few
      // days, so this is keyed on the day, not the case — and it is the last
      // line of defence against Back-button resubmits from the reveal.
      if (state.submissions.some((s) => s.caseId === action.caseId && dayOf(s.playedAt) === today)) {
        return state;
      }
      const firstPlay = !state.submissions.some((s) => s.caseId === action.caseId);

      const submission: Submission = {
        caseId: action.caseId,
        playedAt: now.toISOString(),
        evidenceSelected: action.evidenceSelected,
        choice: action.choice,
        argument: action.argument,
        status: 'pending',
      };

      // Benchmark agreement only counts where the benchmark actually took a
      // side. A genuinely split case has no right answer to agree with. And
      // only on the first play: by a rotation repeat the player has read the
      // benchmark reasoning, so agreeing again is recall, not judgement.
      const favored = c?.benchmark.favored ?? null;
      const agreement =
        favored === null || !firstPlay
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

      /*
       * Rating is routed through applyResult even though it is a no-op today.
       * The archive source reports `live: false`, so the call returns the
       * rating untouched — which is the behaviour we want to keep proving,
       * not a branch to add later.
       */
      const source = opponentSource(false);
      const rated = applyResult(state.rating, state.ratedMatches, STARTING_RATING, won > lost ? 1 : 0, {
        enabled: false,
        live: isRated(source),
      });

      return {
        ...state,
        submissions,
        juryRecord: {
          won: state.juryRecord.won + won,
          lost: state.juryRecord.lost + lost,
        },
        rating: rated.rating,
        ratedMatches: rated.ratedMatches,
      };
    }

    case 'MARK_SEEN': {
      let changed = false;
      const submissions = state.submissions.map((s) => {
        if (s.caseId !== action.caseId || s.status !== 'judged') return s;
        if (action.playedAt !== undefined && s.playedAt !== action.playedAt) return s;
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

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };

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

/** Local calendar day of a play — the same key `todayKey` produces. */
export function dayOf(playedAt: string): string {
  return todayKey(new Date(playedAt));
}

/** The play of this case on the given local day, if there was one. */
export function playedOn(state: PlayerState, caseId: string, date: Date = new Date()): Submission | undefined {
  const key = todayKey(date);
  return state.submissions.find((s) => s.caseId === caseId && dayOf(s.playedAt) === key);
}

/**
 * Which play a result screen should show. With playedAt it is exact. Without
 * it, an unseen verdict wins over a newer pending play — otherwise the Home
 * "Verdict in" card opens a "with the jury" screen and its badge never clears.
 */
export function resultFor(state: PlayerState, caseId: string, playedAt?: string | null): Submission | undefined {
  const plays = state.submissions.filter((s) => s.caseId === caseId);
  if (playedAt) return plays.find((s) => s.playedAt === playedAt);
  return plays.find((s) => s.status === 'judged') ?? plays[0];
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

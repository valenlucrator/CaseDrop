import type { Side } from './case';

export type SubmissionStatus = 'pending' | 'judged' | 'seen';

export interface ScoreBreakdown {
  decision: number; // /20
  evidenceUse: number; // /25
  reasoning: number; // /20
  persuasion: number; // /10
  issueSpotting: number; // /25
  total: number; // /100
}

export interface JuryResult {
  yours: number; // percent
  theirs: number; // percent
  jurors: number;
}

export interface Submission {
  caseId: string;
  playedAt: string; // ISO
  evidenceSelected: [string, string];
  choice: Side;
  argument: string; // ≤60 words
  status: SubmissionStatus;
  opponentArgumentId?: string;
  juryResult?: JuryResult;
  score?: ScoreBreakdown;
}

/** A vote the player cast while serving on someone else's jury. */
export interface JuryVote {
  caseId: string;
  pairKey: string;
  votedFor: 'a' | 'b';
  votedAt: string;
}

export interface PlayerSettings {
  haptics: boolean;
  sound: boolean;
}

export interface PlayerState {
  version: 1;
  createdAt: string;
  settings: PlayerSettings;
  streak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
  casesCompleted: number;
  benchmarkAgreement: { agreed: number; total: number };
  juryRecord: { won: number; lost: number };
  submissions: Submission[];
  juryVotes: JuryVote[];
  juryVotesCast: number;
  /**
   * null until the population gate opens. Rank UI reads `rating === null`
   * and renders the streak/accuracy view instead. One field flips the
   * whole ladder on later.
   */
  rating: number | null;
  /** Live matches that moved the rating. Drives K-factor and placement. */
  ratedMatches: number;
}

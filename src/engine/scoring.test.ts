import { describe, it, expect } from 'vitest';
import {
  scoreDecision,
  scoreEvidenceUse,
  scoreIssueSpotting,
  scorePersuasion,
  scoreReasoning,
  scoreSubmission,
  wordCount,
} from './scoring';
import {
  communitySplit, findOpponent, isRated, isReadyToJudge, JUDGING_DELAY_MS,
  opponentSource, seedArguments, simulateJury, sourceLabel,
  JUDGING_DELAY_FLOOR_MS, JUDGING_DELAY_IS_OVERRIDDEN,
} from './pairing';
import {
  applyResult, expectedScore, isPlacing, kFactor, nextRating, rankFor,
} from './rating';
import { EMPTY_POPULATION, GATES } from './population';
import { FEATURES, isGateMet } from '../config/features';
import { cases, caseForDate, getCase, validateCase } from '../data/cases';
import { entries, getEntry, searchEntries, validateEntry } from '../data/learn';
import type { Case } from '../types/case';

const c001 = getCase('001') as Case; // lean_b
const c002 = getCase('002') as Case; // genuinely_split
const c003 = getCase('003') as Case; // lean_a

describe('case data', () => {
  it('every shipped case passes the §6 structural rules', () => {
    for (const c of cases) expect(validateCase(c)).toEqual([]);
  });

  it('no evidence item is decisive on its own (§6.1)', () => {
    for (const c of cases) {
      for (const e of c.evidence) expect(e.weight).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the benchmark balanced across the set (§6.3)', () => {
    const leanA = cases.filter((c) => c.benchmark.posture === 'lean_a').length;
    const leanB = cases.filter((c) => c.benchmark.posture === 'lean_b').length;
    const dominant = Math.max(leanA, leanB);
    expect(dominant / cases.length).toBeLessThanOrEqual(0.55);
  });

  it('serves a deterministic case per day, rotating the set', () => {
    const a = caseForDate(new Date('2025-06-01T10:00:00'));
    const b = caseForDate(new Date('2025-06-01T22:00:00'));
    expect(a.id).toBe(b.id);
    const seen = new Set(
      Array.from({ length: cases.length }, (_, i) =>
        caseForDate(new Date(2025, 5, 1 + i)).id,
      ),
    );
    expect(seen.size).toBe(cases.length);
  });
});

describe('scoreDecision', () => {
  it('rewards agreeing with the benchmark, but never gives full marks', () => {
    expect(scoreDecision(c003, 'a')).toBe(18);
    expect(scoreDecision(c001, 'b')).toBe(18);
  });

  it('treats a genuinely split case as near-even whichever side you take', () => {
    expect(scoreDecision(c002, 'a')).toBe(16);
    expect(scoreDecision(c002, 'b')).toBe(16);
  });

  it('marks down a contrary call on a leaning case, but never to zero', () => {
    expect(scoreDecision(c003, 'b')).toBe(11);
    expect(scoreDecision(c001, 'a')).toBe(11);
  });
});

describe('scoreEvidenceUse — conditional on the draw', () => {
  it('gives full marks for citing both items the player actually opened', () => {
    const s = {
      evidenceSelected: ['A', 'C'] as [string, string],
      argument:
        'The support chat agent told her it was hers, and clause 9.2 of the refund policy said recovery was automatic and no action was required.',
    };
    expect(scoreEvidenceUse(c001, s)).toBe(25);
  });

  it('reaches full marks on a weak draw too — an unlucky pair is never punished', () => {
    const weak = {
      evidenceSelected: ['A', 'B'] as [string, string],
      argument:
        'The security log shows badge 4471 entered at 02:14, and the termination email from HR revoked all access effective immediately, so permission had been withdrawn.',
    };
    expect(scoreEvidenceUse(c003, weak)).toBe(25);
  });

  it('scores nothing for evidence the argument never touches', () => {
    const s = {
      evidenceSelected: ['A', 'C'] as [string, string],
      argument: 'She should give the money back. It was not hers and everyone knows it.',
    };
    expect(scoreEvidenceUse(c001, s)).toBe(0);
  });

  it('ignores items the player did not open, however relevant they were', () => {
    const cited = {
      evidenceSelected: ['A', 'C'] as [string, string],
      argument: 'The support chat and clause 9.2 of the policy both told her the money was hers.',
    };
    const same = { ...cited, evidenceSelected: ['D', 'E'] as [string, string] };
    expect(scoreEvidenceUse(c001, cited)).toBeGreaterThan(scoreEvidenceUse(c001, same));
  });
});

describe('scoreReasoning and scoreIssueSpotting', () => {
  it('rewards engaging the opposing consideration', () => {
    const bare = { argument: 'She kept money that was not hers.' };
    const engaged = {
      argument:
        'She kept the money because the agent said it was hers. Although the searches suggest doubt, an honest belief is a defence under the rule even where it is unreasonable.',
    };
    expect(scoreReasoning(c001, engaged)).toBeGreaterThan(scoreReasoning(c001, bare));
  });

  it('finds the central issue when the argument names it', () => {
    const onIssue = {
      argument:
        'The question is whether she knew of the error. Her honest belief that the transfer was intended is a complete defence, and the thirty days had not run.',
    };
    const offIssue = { argument: 'Corvid are a big company and can afford the loss.' };
    expect(scoreIssueSpotting(c001, onIssue)).toBeGreaterThan(scoreIssueSpotting(c001, offIssue));
    expect(scoreIssueSpotting(c001, offIssue)).toBeGreaterThan(0);
  });
});

describe('scorePersuasion', () => {
  it('uses the jury result once one exists', () => {
    expect(scorePersuasion({ argument: 'x' }, { yours: 100, theirs: 0 })).toBe(10);
    expect(scorePersuasion({ argument: 'x' }, { yours: 50, theirs: 50 })).toBe(6);
    expect(scorePersuasion({ argument: 'x' }, { yours: 0, theirs: 100 })).toBe(0);
  });

  it('falls back to economy and concreteness while pending', () => {
    const vague = { argument: 'It is simply wrong and should not be allowed at all.' };
    const concrete = {
      argument:
        'Clause 9.2 said recovery was automatic within 14 days, and the agent told her "it is yours to use".',
    };
    expect(scorePersuasion(concrete)).toBeGreaterThan(scorePersuasion(vague));
  });
});

describe('scoreSubmission', () => {
  it('totals the five components and stays inside 0..100', () => {
    for (const c of cases) {
      for (const choice of ['a', 'b'] as const) {
        const s = {
          choice,
          evidenceSelected: [c.evidence[0].id, c.evidence[1].id] as [string, string],
          argument: c.benchmark.forA[0] ?? 'A short argument about the rule and the evidence.',
        };
        const b = scoreSubmission(c, s);
        expect(b.total).toBe(
          b.decision + b.evidenceUse + b.reasoning + b.persuasion + b.issueSpotting,
        );
        expect(b.total).toBeGreaterThanOrEqual(0);
        expect(b.total).toBeLessThanOrEqual(100);
        expect(b.decision).toBeGreaterThan(0);
        expect(b.decision).toBeLessThan(20);
      }
    }
  });
});

describe('wordCount', () => {
  it('counts words, not characters, and treats empty as zero', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
    expect(wordCount('one two  three\nfour')).toBe(4);
  });
});

describe('pairing', () => {
  it('prefers an opponent on the other side of the question', () => {
    const opp = findOpponent('001', ['A', 'C'], 'b');
    expect(opp?.side).toBe('a');
  });

  it('prefers an opponent who saw the same evidence', () => {
    const opp = findOpponent('003', ['E', 'C'], 'a');
    expect(opp?.side).toBe('b');
    expect(opp?.evidenceSeen.sort()).toEqual(['C', 'E']);
  });

  it('is deterministic for the same submission', () => {
    expect(findOpponent('002', ['C', 'D'], 'a')?.id).toBe(findOpponent('002', ['C', 'D'], 'a')?.id);
  });

  it('can exclude opponents already faced', () => {
    const first = findOpponent('001', ['A', 'C'], 'b');
    const second = findOpponent('001', ['A', 'C'], 'b', [first!.id]);
    expect(second?.id).not.toBe(first?.id);
  });

  it('has at least three seed arguments for every shipped case (§8)', () => {
    for (const c of cases) {
      const pool = seedArguments.filter((a) => a.caseId === c.id);
      expect(pool.length).toBeGreaterThanOrEqual(3);
      expect(pool.some((a) => a.side === 'a')).toBe(true);
      expect(pool.some((a) => a.side === 'b')).toBe(true);
    }
  });
});

describe('communitySplit', () => {
  it('stays within ±3 of the authored split and sums to 100', () => {
    for (const c of cases) {
      const { a, b } = communitySplit(c);
      expect(Math.abs(a - c.simulatedSplit.a)).toBeLessThanOrEqual(3);
      expect(a + b).toBe(100);
    }
  });

  it('is stable for a case — every player sees the same number', () => {
    expect(communitySplit(c001)).toEqual(communitySplit(c001));
  });

  it('actually varies between cases (a constant jitter is not a jitter)', () => {
    const offsets = cases.map((c) => communitySplit(c).a - c.simulatedSplit.a);
    expect(new Set(offsets).size).toBeGreaterThan(1);
  });
});

describe('simulateJury', () => {
  const opp = seedArguments.find((a) => a.id === '001-a1')!;

  it('is deterministic', () => {
    const s = { evidenceSelected: ['A', 'C'] as [string, string], argument: 'The agent said it was hers.' };
    expect(simulateJury(c001, s, opp)).toEqual(simulateJury(c001, s, opp));
  });

  it('returns percentages that sum to 100 and a whole number of jurors', () => {
    const s = { evidenceSelected: ['A', 'C'] as [string, string], argument: 'Clause 9.2 said recovery was automatic.' };
    const r = simulateJury(c001, s, opp);
    expect(r.yours + r.theirs).toBe(100);
    expect(Number.isInteger(r.jurors)).toBe(true);
    expect(r.jurors).toBeGreaterThan(0);
  });

  it('rewards the better argument', () => {
    const strong = {
      evidenceSelected: ['A', 'C'] as [string, string],
      argument:
        'She asked the support agent and was told it was hers, and clause 9.2 of the policy said recovery was automatic. An honest belief is a complete defence under the rule, although the searches cut the other way.',
    };
    const weak = { evidenceSelected: ['A', 'C'] as [string, string], argument: 'She should keep it.' };
    expect(simulateJury(c001, strong, opp).yours).toBeGreaterThan(simulateJury(c001, weak, opp).yours);
  });
});

describe('rating — dormant in v1', () => {
  const on = { enabled: true, live: true };

  it('leaves the rating untouched while the feature is off', () => {
    expect(applyResult(1200, 0, 1200, 1, { enabled: false, live: true })).toEqual({
      rating: 1200,
      ratedMatches: 0,
      delta: null,
    });
    expect(applyResult(null, 0, 1200, 1, { enabled: false, live: true }).rating).toBeNull();
  });

  it('never accrues from an archive match, even with the feature on', () => {
    const r = applyResult(1200, 3, 1200, 1, { enabled: true, live: false });
    expect(r.rating).toBe(1200);
    expect(r.delta).toBeNull();
    expect(r.ratedMatches).toBe(3);
  });

  it('moves on a live match once enabled', () => {
    const r = applyResult(1200, 0, 1200, 1, on);
    expect(r.rating).toBe(1216); // K=32 while placing
    expect(r.delta).toBe(16);
    expect(r.ratedMatches).toBe(1);
  });

  it('drops K after the first 20 rated matches', () => {
    expect(kFactor(0)).toBe(32);
    expect(kFactor(19)).toBe(32);
    expect(kFactor(20)).toBe(16);
    expect(applyResult(1200, 25, 1200, 1, on).delta).toBe(8);
  });

  it('computes correct Elo', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
    expect(nextRating(1200, 1200, 1, 24)).toBe(1212);
    expect(nextRating(1200, 1200, 0, 24)).toBe(1188);
    expect(nextRating(1200, 1200, 0.5, 24)).toBe(1200);
  });

  it('hides the number behind Placing… for the first five rated matches', () => {
    expect(isPlacing(1200, 4)).toBe(true);
    expect(rankFor(1200, 4)).toBe('Placing…');
    expect(isPlacing(1200, 5)).toBe(false);
    expect(rankFor(null, 99)).toBeNull();
  });

  it('maps ratings to bands with three divisions, and none on the open top band', () => {
    expect(rankFor(100, 99)).toBe('Law Student III');
    expect(rankFor(900, 99)).toBe('Law Student I'); // top third of 0–999
    expect(rankFor(1050, 99)).toBe('Legal Intern III');
    expect(rankFor(1300, 99)).toBe('Associate III');
    expect(rankFor(1450, 99)).toBe('Associate II');
    expect(rankFor(1550, 99)).toBe('Associate I');
    expect(rankFor(1600, 99)).toBe('Senior Associate III');
    expect(rankFor(2000, 99)).toBe('Counsel III');
    expect(rankFor(2200, 99)).toBe('Partner');
    expect(rankFor(3000, 99)).toBe('Partner');
  });

  it('keeps band boundaries contiguous', () => {
    for (let r = 0; r <= 2600; r += 25) {
      expect(rankFor(r, 99)).not.toBeNull();
    }
  });
});

describe('feature gates', () => {
  it('every flag ships false — Phase A is the default behaviour', () => {
    for (const [name, value] of Object.entries(FEATURES)) {
      expect(value, `${name} should ship disabled`).toBe(false);
    }
  });

  it('a gated feature stays shut with no population, however it is flagged', () => {
    expect(isGateMet('rating', EMPTY_POPULATION)).toBe(false);
    expect(isGateMet('liveOpponents', EMPTY_POPULATION)).toBe(false);
    expect(isGateMet('liveJury', EMPTY_POPULATION)).toBe(false);
  });

  it('opens a gate only at its threshold', () => {
    expect(isGateMet('rating', { ...EMPTY_POPULATION, rating: GATES.rating - 1 })).toBe(false);
    expect(isGateMet('rating', { ...EMPTY_POPULATION, rating: GATES.rating })).toBe(true);
  });

  it('leaves ungated features alone', () => {
    expect(isGateMet('learn', EMPTY_POPULATION)).toBe(true);
    expect(isGateMet('community', EMPTY_POPULATION)).toBe(true);
  });
});

describe('opponent source', () => {
  it('serves the archive while live pairing is off', () => {
    expect(opponentSource(false)).toBe('archive');
    expect(opponentSource(true)).toBe('archive'); // LIVE_PAIRING still false
  });

  it('labels archive matches honestly and never rates them', () => {
    expect(isRated('archive')).toBe(false);
    expect(isRated('live')).toBe(true);
    expect(sourceLabel('archive')).toBe('Compared against the case archive');
    expect(sourceLabel('live')).toBeNull();
  });
});

describe('judging delay', () => {
  it('ships at three hours — the delay is the return hook', () => {
    // The floor is what any built artefact uses. A dev session may shorten
    // the *active* delay via VITE_JUDGING_DELAY_MS, but it cannot move this.
    expect(JUDGING_DELAY_FLOOR_MS).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000);
  });

  it('only ever shortens the delay in a dev session', () => {
    if (!import.meta.env.DEV) {
      expect(JUDGING_DELAY_MS).toBe(JUDGING_DELAY_FLOOR_MS);
      expect(JUDGING_DELAY_IS_OVERRIDDEN).toBe(false);
    }
    // Whatever the environment, the override can never lengthen the wait
    // beyond the shipped floor or drop it to zero.
    expect(JUDGING_DELAY_MS).toBeGreaterThan(0);
    expect(JUDGING_DELAY_MS).toBeLessThanOrEqual(JUDGING_DELAY_FLOOR_MS);
  });

  it('holds a submission pending until the window passes', () => {
    const now = Date.now();
    const played = new Date(now).toISOString();
    expect(isReadyToJudge(played, now)).toBe(false);
    expect(isReadyToJudge(played, now + JUDGING_DELAY_MS - 1)).toBe(false);
    expect(isReadyToJudge(played, now + JUDGING_DELAY_MS)).toBe(true);
  });
});

describe('learn entries', () => {
  it('meets the minimum viable content bar (25 entries)', () => {
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('keeps every meaning inside the word cap and every link resolvable', () => {
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });

  it('links every case concept to a real entry', () => {
    for (const c of cases) {
      expect(c.concepts.length).toBeGreaterThan(0);
      for (const id of c.concepts) {
        expect(getEntry(id), `${c.id} references missing concept "${id}"`).toBeDefined();
      }
    }
  });

  it('searches term, meaning and category', () => {
    expect(searchEntries('hearsay').map((e) => e.id)).toContain('objection-hearsay');
    expect(searchEntries('Objections').length).toBeGreaterThan(1);
    expect(searchEntries('zzzzz')).toEqual([]);
    expect(searchEntries('').length).toBe(entries.length);
  });
});

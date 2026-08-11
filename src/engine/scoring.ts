import type { Case, EvidenceItem } from '../types/case';
import type { ScoreBreakdown, Submission } from '../types/player';

/**
 * Pure scoring. No React, no DOM, no imports from screens/ — this module is
 * the one part of the app that can be verified at a desk with no browser.
 */

const CONCESSION = [
  'but',
  'although',
  'though',
  'however',
  'even if',
  'even where',
  'while',
  'whereas',
  'granted',
  'admittedly',
  'against that',
  'on the other side',
  'the difficulty is',
  'it is true that',
];

const REASON = [
  'because',
  'since',
  'given',
  'therefore',
  'so that',
  'the rule',
  'requires',
  'under',
  'means that',
  'follows',
  'which is why',
];

function normalize(s: string): string {
  return (
    ' ' +
    s
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^a-z0-9%:.'\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() +
    ' '
  );
}

/** Count how many of `terms` appear in `text`. Short terms need word boundaries. */
function hits(text: string, terms: string[]): number {
  const h = normalize(text);
  let n = 0;
  for (const raw of terms) {
    const t = normalize(raw).trim();
    if (!t) continue;
    if (t.length <= 3 || /^[0-9%.:]+$/.test(t)) {
      if (h.includes(` ${t} `)) n++;
    } else if (h.includes(t)) n++;
  }
  return n;
}

export function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Terms that prove a given evidence item was actually used in the argument. */
function termsFor(item: EvidenceItem): string[] {
  const labelTokens = item.label.split(/\s+/).filter((w) => w.length > 3);
  return [...item.keyTerms, ...labelTokens, item.label];
}

/**
 * Decision — /20.
 * Never 20 and never 0: the benchmark is an opinion, and the UI says so.
 */
export function scoreDecision(c: Case, choice: Submission['choice']): number {
  const b = c.benchmark;
  if (b.favored !== null && choice === b.favored) return 18;
  if (b.posture === 'genuinely_split') return 16;
  return 11;
}

/**
 * Evidence use — /25, scored *conditionally on what was drawn*.
 * Full marks are reachable with a weak draw. A player is never penalised
 * for the evidence they did not get.
 */
export function scoreEvidenceUse(c: Case, s: Pick<Submission, 'evidenceSelected' | 'argument'>): number {
  const per = 25 / s.evidenceSelected.length;
  let total = 0;
  for (const id of s.evidenceSelected) {
    const item = c.evidence.find((e) => e.id === id);
    if (!item) continue;
    const h = hits(s.argument, termsFor(item));
    if (h >= 2) total += per;
    else if (h === 1) total += per * 0.7;
  }
  return Math.round(total);
}

/** Reasoning — /20. v1 heuristic: is there a stated reason, and is the other side engaged? */
export function scoreReasoning(c: Case, s: Pick<Submission, 'argument'>): number {
  let score = 0;
  if (hits(s.argument, REASON) > 0) score += 8;
  if (hits(s.argument, CONCESSION) > 0) score += 6;
  if (hits(s.argument, c.benchmark.centralTerms) > 0) score += 6;
  return Math.min(20, score);
}

/** Issue spotting — /25. Does the argument find the thing the case actually turns on? */
export function scoreIssueSpotting(c: Case, s: Pick<Submission, 'argument'>): number {
  const h = hits(s.argument, c.benchmark.centralTerms);
  if (h >= 4) return 25;
  if (h === 3) return 21;
  if (h === 2) return 17;
  if (h === 1) return 12;
  return 5;
}

/**
 * Persuasion — /10. From the jury result once judged; from word economy and
 * concreteness while pending.
 */
export function scorePersuasion(
  s: Pick<Submission, 'argument'>,
  juryResult?: { yours: number; theirs: number },
): number {
  if (juryResult) {
    const { yours } = juryResult;
    const raw = yours >= 50 ? 6 + ((yours - 50) / 50) * 4 : (yours / 50) * 6;
    return Math.round(Math.max(0, Math.min(10, raw)));
  }
  const w = wordCount(s.argument);
  let score = 0;
  if (w >= 20 && w <= 60) score += 4;
  else if (w >= 12) score += 2;
  // Concreteness: a number, a quotation, or a date does more work than an adjective.
  if (/[0-9]/.test(s.argument)) score += 3;
  if (/["'“‘]/.test(s.argument)) score += 2;
  if (w > 0 && w <= 45) score += 1;
  return Math.min(10, score);
}

export function scoreSubmission(
  c: Case,
  s: Pick<Submission, 'choice' | 'evidenceSelected' | 'argument'>,
  juryResult?: { yours: number; theirs: number },
): ScoreBreakdown {
  const decision = scoreDecision(c, s.choice);
  const evidenceUse = scoreEvidenceUse(c, s);
  const reasoning = scoreReasoning(c, s);
  const issueSpotting = scoreIssueSpotting(c, s);
  const persuasion = scorePersuasion(s, juryResult);
  return {
    decision,
    evidenceUse,
    reasoning,
    persuasion,
    issueSpotting,
    total: decision + evidenceUse + reasoning + persuasion + issueSpotting,
  };
}

/**
 * Craft quality on 0..1, ignoring whether the player agreed with the
 * benchmark. This is what the jury is actually reacting to — jurors read the
 * argument, they do not know the benchmark.
 */
export function argumentQuality(c: Case, s: Pick<Submission, 'evidenceSelected' | 'argument'>): number {
  const craft =
    scoreEvidenceUse(c, s) + scoreReasoning(c, s) + scoreIssueSpotting(c, s) + scorePersuasion(s);
  return Math.max(0, Math.min(1, craft / 80));
}

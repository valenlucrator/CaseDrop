import type { Case } from '../../types/case';
import raw001 from './001-second-refund.json';
import raw002 from './002-last-kilometers.json';
import raw003 from './003-locked-office.json';

/**
 * Benchmark balance ledger — blueprint §6.3.
 * No more than 55% of the launch set may lean the same direction.
 *
 *   001 second-refund    lean_b
 *   002 last-kilometers  genuinely_split
 *   003 locked-office    lean_a
 *
 * Current: 1 lean_a · 1 lean_b · 1 split. Balanced.
 *
 * Launch audit (Nov 2026): 002's rule gained the journey-home / dual-purpose
 * limb. Without it the rule's own text ("relevant but not decisive", "what
 * was actually tolerated") answered the case for A, and "genuinely_split"
 * was not true. Postures unchanged, so the ledger still balances.
 *
 * Only three cases exist, so launch week (20–27 Nov) serves each two or
 * three times: 002 on 20/23/26, 003 on 21/24/27, 001 on 22/25.
 * Update this comment whenever a case is added. If it ever reads
 * "4 lean_a / 2 lean_b", players have learned the shortcut and the game
 * is solved.
 */

export const cases: Case[] = [raw001 as Case, raw002 as Case, raw003 as Case];

/**
 * Structural checks for the rules that are cheap to verify. These run in
 * dev only — a violation is an authoring bug, not a runtime condition.
 */
export function validateCase(c: Case): string[] {
  const problems: string[] = [];

  if (c.evidence.length !== 5) {
    problems.push(`${c.id}: expected 5 evidence items, found ${c.evidence.length}`);
  }

  const ids = new Set(c.evidence.map((e) => e.id));
  if (ids.size !== c.evidence.length) {
    problems.push(`${c.id}: duplicate evidence ids`);
  }

  // §6.1 — no single item may decide the case.
  for (const e of c.evidence) {
    if (e.weight > 2) {
      problems.push(`${c.id}/${e.id}: weight ${e.weight} — decisiveness must come from a combination`);
    }
  }

  // §6.4 — ambiguity must be real.
  const a = c.simulatedSplit.a;
  if (a < 45 || a > 70) {
    problems.push(`${c.id}: simulated split ${a}% is outside the 45–70 target — that's a quiz, not a case`);
  }

  // §6.6 — length.
  const words = c.scenario.trim().split(/\s+/).length;
  if (words < 150 || words > 250) {
    problems.push(`${c.id}: scenario is ${words} words, target 150–250`);
  }
  for (const e of c.evidence) {
    const ew = e.body.trim().split(/\s+/).length;
    if (ew > 120) problems.push(`${c.id}/${e.id}: evidence body is ${ew} words, max 120`);
  }

  if (c.benchmark.posture === 'genuinely_split' && c.benchmark.favored !== null) {
    problems.push(`${c.id}: genuinely_split cases must have favored: null`);
  }

  return problems;
}

if (import.meta.env.DEV) {
  const all = cases.flatMap(validateCase);
  if (all.length) console.warn('[casedrop] case validation:\n' + all.join('\n'));
}

export function getCase(id: string): Case | undefined {
  return cases.find((c) => c.id === id);
}

/**
 * One case per day, rotating through the set. Deterministic from the date
 * so every player on a given day gets the same case — which is what makes
 * the community split mean anything.
 */
export function caseForDate(date: Date = new Date()): Case {
  const epoch = Date.UTC(2025, 0, 1);
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - epoch) / 86_400_000);
  return cases[((day % cases.length) + cases.length) % cases.length];
}

export function todayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

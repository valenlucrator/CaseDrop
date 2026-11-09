import { describe, it, expect } from 'vitest';
import { caseForDate, getCase, todayKey, validateCase } from './index';
import { findOpponent, seedArguments } from '../../engine/pairing';
import { scoreSubmission } from '../../engine/scoring';
import type { Case } from '../../types/case';

/**
 * Launch week, 20–27 November 2026. The rotation is deterministic from the
 * local calendar date, so the schedule is a fact these tests can pin.
 */
const LAUNCH_WEEK: [number, string][] = [
  [20, '002'],
  [21, '003'],
  [22, '001'],
  [23, '002'],
  [24, '003'],
  [25, '001'],
  [26, '002'],
  [27, '003'],
];

describe('launch-week schedule', () => {
  it.each(LAUNCH_WEEK)('2026-11-%i serves case %s', (d, id) => {
    expect(caseForDate(new Date(2026, 10, d, 12)).id).toBe(id);
  });

  it('switches case at local midnight, not UTC midnight', () => {
    expect(caseForDate(new Date(2026, 10, 20, 0, 1)).id).toBe('002');
    expect(caseForDate(new Date(2026, 10, 20, 23, 59)).id).toBe('002');
    expect(caseForDate(new Date(2026, 10, 21, 0, 1)).id).toBe('003');
    expect(todayKey(new Date(2026, 10, 20, 23, 59))).toBe('2026-11-20');
  });

  it('every launch-week case passes structural validation', () => {
    for (const [d] of LAUNCH_WEEK) expect(validateCase(caseForDate(new Date(2026, 10, d, 12)))).toEqual([]);
  });

  it('every side of every launch-week case has an archive opponent, whatever pair was drawn', () => {
    // A missing opponent leaves a submission pending forever — no verdict, no result.
    const ids = ['A', 'B', 'C', 'D', 'E'];
    for (const [d] of LAUNCH_WEEK) {
      const c = caseForDate(new Date(2026, 10, d, 12));
      for (const side of ['a', 'b'] as const) {
        expect(seedArguments.some((s) => s.caseId === c.id && s.side !== side)).toBe(true);
        for (let i = 0; i < ids.length; i++)
          for (let j = i + 1; j < ids.length; j++)
            expect(findOpponent(c.id, [ids[i], ids[j]], side)?.side).not.toBe(side);
      }
    }
  });

  it('either decision on either case scores without crashing and stays within 0–100', () => {
    for (const id of ['001', '002', '003']) {
      const c = getCase(id) as Case;
      for (const choice of ['a', 'b'] as const) {
        const s = scoreSubmission(c, { choice, evidenceSelected: ['A', 'B'], argument: '' });
        expect(s.total).toBeGreaterThanOrEqual(0);
        expect(s.total).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ---- content regressions found in the launch audit -------------------------

const MS_DAY = 86_400_000;
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / MS_DAY);

describe('001 — The Second Refund: dates and the thirty-day rule agree', () => {
  const c = getCase('001') as Case;

  it('the day count in the scenario is measured from the second refund', () => {
    expect(days(new Date(2026, 3, 4), new Date(2026, 4, 5))).toBe(31);
    expect(c.scenario).toContain('thirty-one days after the second refund');
    expect(c.scenario).not.toContain('day thirty-four');
  });

  it('the benchmark applies the statutory thirty days, not the email’s seven', () => {
    // The old reasoning said the seven-day window "had not run out" by 20 May. It had (12 May).
    expect(c.benchmark.reasoning).not.toMatch(/seven-day window/);
    const fourJune = new Date(2026, 4, 5 + 30);
    expect([fourJune.getMonth(), fourJune.getDate()]).toEqual([5, 4]);
    expect(c.benchmark.reasoning).toContain('4 June');
    expect(c.scenario).toContain('27 May');
  });

  it('the scenario does not claim the money was gone when the statement shows it was not', () => {
    // 63 + 2×1,240 − 1,190 rent = 1,353 on 5 April: more than the duplicate.
    expect(63 + 2 * 1240 - 1190).toBeGreaterThan(1240);
    expect(c.scenario).not.toContain('The money was gone by the 5th');
  });
});

describe('002 — The Last Kilometers: the rule leaves the case genuinely split', () => {
  const c = getCase('002') as Case;

  it('states the journey rule the B side depends on', () => {
    expect(c.jurisdictionRule).toMatch(/journey home is not in the course of employment/);
    expect(c.benchmark.posture).toBe('genuinely_split');
    expect(c.benchmark.forB.some((x) => /way home/.test(x))).toBe(true);
  });

  it('archive prose does not credit the undelivered parcel with the saving', () => {
    const a1 = seedArguments.find((s) => s.id === '002-a1');
    expect(a1?.text).not.toContain('the parcel he was carrying');
  });
});

describe('003 — The Locked Office: benchmark claims stay inside the evidence', () => {
  it('does not assert he "never" used the audit line — no evidence says so', () => {
    const c = getCase('003') as Case;
    expect(c.benchmark.forA.join(' ')).not.toMatch(/never did/);
  });
});

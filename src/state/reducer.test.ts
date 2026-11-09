import { describe, it, expect } from 'vitest';
import { reducer, resultFor, playedOn } from './reducer';
import { freshState } from './storage';
import type { PlayerState } from '../types/player';
import { emptyPlay, flowRedirect, playReducer, type PlayState } from './PlayContext';

/**
 * The daily case rotates through a small set, so the same caseId comes back
 * every few days (002 is served on both 20 and 23 November 2026). These tests
 * pin the behaviour that rotation depends on: a submission is identified by
 * case AND play, never by case alone.
 */

const day = (d: number, h = 10) => new Date(2026, 10, d, h);

function submit(state: PlayerState, caseId: string, now: Date, choice: 'a' | 'b' = 'a'): PlayerState {
  return reducer(state, {
    type: 'SUBMIT_CASE',
    caseId,
    evidenceSelected: ['A', 'B'],
    choice,
    argument: 'Because the rule requires it.',
    now,
  });
}

describe('SUBMIT_CASE — one submission per case per day', () => {
  it('ignores a second submission of the same case on the same local day', () => {
    // The Back button from the reveal used to re-enable submit and create a duplicate.
    let s = submit(freshState(), '002', day(20, 9));
    s = submit(s, '002', day(20, 9));
    s = submit(s, '002', day(20, 22));
    expect(s.submissions).toHaveLength(1);
    expect(s.casesCompleted).toBe(1);
  });

  it('accepts the same case again when the rotation brings it back on a later day', () => {
    let s = submit(freshState(), '002', day(20));
    s = submit(s, '002', day(23));
    expect(s.submissions).toHaveLength(2);
    expect(s.streak).toBe(1); // 21 and 22 were missed
  });

  it('keeps the streak alive across a rotation repeat played on consecutive days', () => {
    let s = freshState();
    for (const [d, id] of [[20, '002'], [21, '003'], [22, '001'], [23, '002']] as const) s = submit(s, id, day(d));
    expect(s.streak).toBe(4);
  });

  it('counts benchmark agreement only on the first play of a case', () => {
    // 003 favours 'a'. By the repeat the player has read the benchmark reasoning,
    // so a second "agreement" would be recall, not judgement.
    let s = submit(freshState(), '003', day(21), 'b');
    expect(s.benchmarkAgreement).toEqual({ agreed: 0, total: 1 });
    s = submit(s, '003', day(24), 'a');
    expect(s.benchmarkAgreement).toEqual({ agreed: 0, total: 1 });
  });
});

describe('results are per play, not per case', () => {
  const judgedTwice = (): PlayerState => {
    let s = submit(freshState(), '002', day(20));
    s = submit(s, '002', day(23, 9));
    // Judge everything: the delay is 3h and both plays are older than that.
    return reducer(s, { type: 'JUDGE_PENDING', now: day(23, 18).getTime() });
  };

  it('MARK_SEEN with playedAt clears only that play', () => {
    const s = judgedTwice();
    const [newer, older] = s.submissions;
    const after = reducer(s, { type: 'MARK_SEEN', caseId: '002', playedAt: older.playedAt });
    expect(after.submissions.find((x) => x.playedAt === older.playedAt)?.status).toBe('seen');
    expect(after.submissions.find((x) => x.playedAt === newer.playedAt)?.status).toBe('judged');
  });

  it('resultFor resolves the exact play when given playedAt', () => {
    const s = judgedTwice();
    const older = s.submissions[1];
    expect(resultFor(s, '002', older.playedAt)?.playedAt).toBe(older.playedAt);
  });

  it('resultFor without playedAt prefers an unseen verdict over a pending newer play', () => {
    // Nov 20 judged, Nov 23 still pending: the "Verdict in" card must open the
    // Nov 20 result, not the pending one (which left the badge stuck forever).
    let s = submit(freshState(), '002', day(20));
    s = reducer(s, { type: 'JUDGE_PENDING', now: day(21).getTime() });
    s = submit(s, '002', day(23));
    expect(s.submissions[0].status).toBe('pending');
    expect(resultFor(s, '002')?.status).toBe('judged');
  });

  it('playedOn matches by local calendar day', () => {
    const s = submit(freshState(), '002', day(20, 23));
    expect(playedOn(s, '002', day(20, 1))).toBeDefined();
    expect(playedOn(s, '002', day(23, 1))).toBeUndefined();
  });
});

// ---- in-session play flow --------------------------------------------------


describe('playReducer — opening evidence is final', () => {
  const begun = playReducer(emptyPlay, { type: 'BEGIN', caseId: '002', day: '2026-11-20' });
  const open = (s: PlayState, id: string) => playReducer(s, { type: 'OPEN_EVIDENCE', id, max: 2 });

  it('cannot close an opened item to open a different one', () => {
    // Regression: un-ticking used to let a player read all five bodies.
    let s = open(open(begun, 'A'), 'B');
    s = open(s, 'A'); // tap again — must not close it
    s = open(s, 'C');
    expect(s.selected).toEqual(['A', 'B']);
  });

  it('BEGIN keeps a same-day session and discards one from another day', () => {
    const s = open(begun, 'A');
    expect(playReducer(s, { type: 'BEGIN', caseId: '002', day: '2026-11-20' }).selected).toEqual(['A']);
    // 002 comes back on the 23rd; a stale session from the 20th must not carry over.
    expect(playReducer(s, { type: 'BEGIN', caseId: '002', day: '2026-11-23' }).selected).toEqual([]);
  });
});

describe('flowRedirect — no screen the player cannot complete', () => {
  const c = { id: '002', selectCount: 2 };
  const ready: PlayState = { caseId: '002', day: '2026-11-20', selected: ['A', 'C'], choice: 'a', argument: '' };

  it('sends a reloaded/deep-linked decision or argument screen back to evidence', () => {
    expect(flowRedirect('decision', emptyPlay, c, undefined)).toBe('/play/002/evidence');
    expect(flowRedirect('argument', { ...ready, selected: ['A'] }, c, undefined)).toBe('/play/002/evidence');
  });

  it('sends an argument screen with no decision back to the decision', () => {
    expect(flowRedirect('argument', { ...ready, choice: null }, c, undefined)).toBe('/play/002/decision');
  });

  it('renders when prerequisites are met', () => {
    expect(flowRedirect('decision', ready, c, undefined)).toBeNull();
    expect(flowRedirect('argument', ready, c, undefined)).toBeNull();
    expect(flowRedirect('evidence', emptyPlay, c, undefined)).toBeNull();
  });

  it('sends every step to the result once today is submitted (Back from the reveal)', () => {
    const at = '2026-11-20T09:00:00.000Z';
    for (const step of ['intro', 'evidence', 'decision', 'argument'] as const) {
      expect(flowRedirect(step, ready, c, { playedAt: at })).toBe(`/result/002?at=${encodeURIComponent(at)}`);
    }
  });
});

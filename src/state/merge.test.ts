import { describe, it, expect } from 'vitest';
import { mergeStates } from './merge';
import { freshState } from './storage';
import { reducer } from './reducer';
import type { PlayerState, Submission } from '../types/player';

function sub(over: Partial<Submission> = {}): Submission {
  return {
    caseId: '001',
    playedAt: '2026-01-01T10:00:00.000Z',
    evidenceSelected: ['A', 'C'],
    choice: 'b',
    argument: 'local argument',
    status: 'pending',
    ...over,
  };
}

function stateWith(subs: Submission[], over: Partial<PlayerState> = {}): PlayerState {
  return { ...freshState(), submissions: subs, ...over };
}

describe('mergeStates', () => {
  it('keeps submissions from both sides', () => {
    const local = stateWith([sub({ caseId: '001' })]);
    const remote = stateWith([sub({ caseId: '002' })]);
    const merged = mergeStates(local, remote);
    expect(merged.submissions.map((s) => s.caseId).sort()).toEqual(['001', '002']);
  });

  it('lets the newer playedAt win for the same case', () => {
    const older = sub({ playedAt: '2026-01-01T10:00:00.000Z', argument: 'older' });
    const newer = sub({ playedAt: '2026-01-02T10:00:00.000Z', argument: 'newer' });
    expect(mergeStates(stateWith([newer]), stateWith([older])).submissions[0].argument).toBe('newer');
    expect(mergeStates(stateWith([older]), stateWith([newer])).submissions[0].argument).toBe('newer');
  });

  it('prefers the judged copy when both sides played at the same moment', () => {
    const local = sub({ status: 'pending' });
    const remote = sub({
      status: 'judged',
      juryResult: { yours: 71, theirs: 29, jurors: 9 },
    });
    const merged = mergeStates(stateWith([local]), stateWith([remote]));
    expect(merged.submissions[0].status).toBe('judged');
    expect(merged.submissions[0].juryResult?.yours).toBe(71);
  });

  it('derives counters instead of summing them — no double counting', () => {
    const shared = sub({ status: 'judged', juryResult: { yours: 60, theirs: 40, jurors: 9 } });
    const local = stateWith([shared], { casesCompleted: 1, juryRecord: { won: 1, lost: 0 } });
    const remote = stateWith([shared], { casesCompleted: 1, juryRecord: { won: 1, lost: 0 } });
    const merged = mergeStates(local, remote);
    expect(merged.casesCompleted).toBe(1);
    expect(merged.juryRecord).toEqual({ won: 1, lost: 0 });
  });

  it('recomputes benchmark agreement, skipping genuinely split cases', () => {
    // 001 favours 'b'; 002 is genuinely_split so it must not count at all.
    const merged = mergeStates(
      stateWith([sub({ caseId: '001', choice: 'b' })]),
      stateWith([sub({ caseId: '002', choice: 'a' })]),
    );
    expect(merged.benchmarkAgreement).toEqual({ agreed: 1, total: 1 });
  });

  it('unions jury votes by pair and keeps the count honest', () => {
    const vote = { caseId: '001', pairKey: 'p1', votedFor: 'a' as const, votedAt: 'x' };
    const merged = mergeStates(
      stateWith([], { juryVotes: [vote], juryVotesCast: 1 }),
      stateWith([], { juryVotes: [vote], juryVotesCast: 1 }),
    );
    expect(merged.juryVotes).toHaveLength(1);
    expect(merged.juryVotesCast).toBe(1);
  });

  it('takes the longer streak and the later play date', () => {
    const merged = mergeStates(
      stateWith([], { streak: 2, lastPlayedDate: '2026-01-05' }),
      stateWith([], { streak: 5, lastPlayedDate: '2026-01-09' }),
    );
    expect(merged.streak).toBe(5);
    expect(merged.lastPlayedDate).toBe('2026-01-09');
  });

  it('treats the server as authoritative for rating', () => {
    const merged = mergeStates(
      stateWith([], { rating: null, ratedMatches: 0 }),
      stateWith([], { rating: 1310, ratedMatches: 7 }),
    );
    expect(merged.rating).toBe(1310);
    expect(merged.ratedMatches).toBe(7);
  });

  it('is idempotent — syncing twice changes nothing', () => {
    const local = stateWith([sub({ caseId: '001' })], { streak: 3 });
    const remote = stateWith([sub({ caseId: '002' })], { streak: 1 });
    const once = mergeStates(local, remote);
    expect(mergeStates(once, once)).toEqual(once);
  });
});

describe('settings survive a schema change', () => {
  it('defaults haptics on and sound off', () => {
    const s = freshState();
    expect(s.settings).toEqual({ haptics: true, sound: false });
  });

  it('flips one setting without touching the other', () => {
    const s = reducer(freshState(), { type: 'SET_SETTING', key: 'sound', value: true });
    expect(s.settings).toEqual({ haptics: true, sound: true });
  });
});

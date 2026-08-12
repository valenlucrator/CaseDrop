import type { PlayerState, Submission } from '../types/player';
import type { Side } from '../types/case';
import { freshState } from './storage';
import { mergeStates } from './merge';

/**
 * Supabase-backed sync, dormant behind FEATURES.cloudSync.
 *
 * The client is loaded with a dynamic import so that a build with the flag
 * off never pays for the SDK — it lands in its own chunk that is requested
 * only when sync actually turns on.
 *
 * localStorage remains the write-through cache and the offline path. The app
 * must stay fully playable with the network down, which means nothing here
 * is ever awaited on the critical path of a play session.
 */

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

let clientPromise: Promise<SupabaseClient> | null = null;

async function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('sync: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set');
  const { createClient: create } = await import('@supabase/supabase-js');
  return create(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
}

function client(): Promise<SupabaseClient> {
  clientPromise ??= createClient();
  return clientPromise;
}

/**
 * Anonymous-first: the player is an account holder before they know it.
 * No signup screen, no friction, nothing to dismiss on first open.
 */
export async function ensureSession(): Promise<string | null> {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error) return null;
  return anon.user?.id ?? null;
}

interface SubmissionRow {
  case_id: string;
  played_at: string;
  evidence_selected: string[];
  choice: Side;
  argument: string;
  status: Submission['status'];
  jury_yours: number | null;
  jury_theirs: number | null;
  jury_jurors: number | null;
  score: Submission['score'] | null;
}

function rowToSubmission(r: SubmissionRow): Submission {
  return {
    caseId: r.case_id,
    playedAt: r.played_at,
    evidenceSelected: [r.evidence_selected[0], r.evidence_selected[1]],
    choice: r.choice,
    argument: r.argument,
    status: r.status,
    juryResult:
      r.jury_yours !== null && r.jury_theirs !== null && r.jury_jurors !== null
        ? { yours: r.jury_yours, theirs: r.jury_theirs, jurors: r.jury_jurors }
        : undefined,
    score: r.score ?? undefined,
  };
}

export async function pullRemote(playerId: string): Promise<PlayerState> {
  const sb = await client();
  const [{ data: player }, { data: subs }] = await Promise.all([
    sb.from('players').select('*').eq('id', playerId).maybeSingle(),
    sb.from('submissions').select('*').eq('player_id', playerId),
  ]);

  const base = freshState();
  if (!player) return base;

  return {
    ...base,
    createdAt: player.created_at ?? base.createdAt,
    settings: { ...base.settings, ...(player.settings ?? {}) },
    streak: player.streak ?? 0,
    lastPlayedDate: player.last_played ?? null,
    rating: player.rating ?? null,
    ratedMatches: player.rated_matches ?? 0,
    submissions: ((subs ?? []) as SubmissionRow[]).map(rowToSubmission),
  };
}

export async function pushLocal(playerId: string, state: PlayerState): Promise<void> {
  const sb = await client();
  await sb.from('players').upsert({
    id: playerId,
    settings: state.settings,
    streak: state.streak,
    last_played: state.lastPlayedDate,
    rating: state.rating,
    rated_matches: state.ratedMatches,
  });

  if (!state.submissions.length) return;
  await sb.from('submissions').upsert(
    state.submissions.map((s) => ({
      player_id: playerId,
      case_id: s.caseId,
      played_at: s.playedAt,
      evidence_selected: s.evidenceSelected,
      choice: s.choice,
      argument: s.argument,
      status: s.status,
      jury_yours: s.juryResult?.yours ?? null,
      jury_theirs: s.juryResult?.theirs ?? null,
      jury_jurors: s.juryResult?.jurors ?? null,
      score: s.score ?? null,
    })),
    { onConflict: 'player_id,case_id,played_at' },
  );
}

/**
 * First authenticated load: pull, merge local on top, push the result back.
 * This is the collision case that matters — existing local state on a device
 * signing in to an account that already has state.
 */
export async function syncOnce(local: PlayerState): Promise<PlayerState> {
  const playerId = await ensureSession();
  if (!playerId) return local;
  const remote = await pullRemote(playerId);
  const merged = mergeStates(local, remote);
  await pushLocal(playerId, merged);
  return merged;
}

/**
 * The claim prompt is deferred to a moment of earned value — after a jury
 * win, or a three-day streak. Never a wall at launch.
 */
export function shouldPromptClaim(state: PlayerState): boolean {
  return state.juryRecord.won > 0 || state.streak >= 3;
}

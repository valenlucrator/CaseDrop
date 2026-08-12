-- CaseDrop v2 schema.
--
-- Written before the client code, because the access rules are the design.
-- The load-bearing rule: a juror must never be able to reach a player
-- identity from an argument. Everything else follows from that.

create table if not exists players (
  id            uuid primary key references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  email         text,
  display_name  text,
  settings      jsonb not null default '{"haptics":true,"sound":false}'::jsonb,
  streak        int  not null default 0,
  last_played   date,
  rating        int,                       -- null until the population gate opens
  rated_matches int  not null default 0
);

create table if not exists submissions (
  id                     uuid primary key default gen_random_uuid(),
  player_id              uuid not null references players (id) on delete cascade,
  case_id                text not null,
  played_at              timestamptz not null default now(),
  evidence_selected      text[] not null,
  choice                 text not null check (choice in ('a', 'b')),
  argument               text not null,
  status                 text not null default 'pending'
                           check (status in ('pending', 'judged', 'seen')),
  opponent_submission_id uuid references submissions (id) on delete set null,
  jury_yours             int,
  jury_theirs            int,
  jury_jurors            int,
  score                  jsonb,
  unique (player_id, case_id, played_at)
);

create index if not exists submissions_case_pending_idx
  on submissions (case_id, status) where status = 'pending';

create table if not exists pairs (
  id           uuid primary key default gen_random_uuid(),
  case_id      text not null,
  submission_a uuid not null references submissions (id) on delete cascade,
  submission_b uuid not null references submissions (id) on delete cascade,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  check (submission_a <> submission_b)
);

create table if not exists jury_votes (
  id         uuid primary key default gen_random_uuid(),
  voter_id   uuid not null references players (id) on delete cascade,
  pair_id    uuid not null references pairs (id) on delete cascade,
  chose      text not null check (chose in ('a', 'b')),
  created_at timestamptz not null default now(),
  unique (voter_id, pair_id)   -- one vote per juror per pair
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table players     enable row level security;
alter table submissions enable row level security;
alter table pairs       enable row level security;
alter table jury_votes  enable row level security;

-- A player sees only their own row.
create policy players_self on players
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- A player sees only their own submissions. Note there is deliberately NO
-- policy granting read access to anyone else's submission row: jurors reach
-- arguments through the view below, which does not expose player_id at all.
create policy submissions_self on submissions
  for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- Pairs are readable to a juror who is not one of the two authors.
create policy pairs_readable_to_jurors on pairs
  for select using (
    not exists (
      select 1 from submissions s
      where s.id in (pairs.submission_a, pairs.submission_b)
        and s.player_id = auth.uid()
    )
  );

create policy jury_votes_self on jury_votes
  for all using (auth.uid() = voter_id) with check (auth.uid() = voter_id);

-- ---------------------------------------------------------------------------
-- The only path from a juror to an argument.
--
-- security_invoker = off so the view can read argument text the juror has no
-- direct grant on, while the projection guarantees no player_id, no case of
-- joining identity back in. A juror sees two anonymous bodies and nothing else.
-- ---------------------------------------------------------------------------

create or replace view jury_queue
with (security_invoker = off) as
select
  p.id                as pair_id,
  p.case_id,
  a.argument          as argument_a,
  b.argument          as argument_b,
  a.evidence_selected as evidence_a,
  b.evidence_selected as evidence_b
from pairs p
join submissions a on a.id = p.submission_a
join submissions b on b.id = p.submission_b
where p.resolved_at is null
  and a.player_id <> auth.uid()
  and b.player_id <> auth.uid()
  and not exists (
    select 1 from jury_votes v
    where v.pair_id = p.id and v.voter_id = auth.uid()
  );

revoke all on jury_queue from anon, authenticated;
grant select on jury_queue to authenticated;

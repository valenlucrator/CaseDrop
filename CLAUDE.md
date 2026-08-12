# CaseDrop

Short-form legal reasoning game. Mobile web, 390×844 target.

## Phase state

Phase A (motion/haptics) — active.
Phase B (accounts, rating, learn, community) — build behind flags in
config/features.ts. Every B feature must degrade to its A behaviour when
its flag is false. No B feature may be a hard dependency of the play loop.

## Scope contract

Ship: Home, Jury, Profile. Daily case. Choose 2 of 5. Binary decision.
60-word argument. Community reveal. Jury vote. Async result. localStorage.

Do NOT build without an explicit instruction: Learn tab, Community tab,
groups, leaderboards, Sunday Trial, subscriptions, tickets, accounts,
push, real-time, native wrapper, animation library, state library.

If a task seems to need something on the cut list, stop and ask.

A feature enters the ship list only when a metric demands it. Write the
metric down first. "Users asked for it" is not a metric; "8 of 10 testers
stopped at the same place" is.

**The tell.** If a session ends with more files than the plan called for,
stop and re-read this section. The v1 target was ~30 files; the motion pass
and the Phase B scaffolding raised the ceiling to ~70. That ceiling moved
because a brief asked for it, which is the only reason it may ever move.

## Flow order (do not reorder)

```
Intro → Evidence → Decision → Argument → CommunityReveal → Jury
```

Result is a SEPARATE entry from Home, not a continuation. Seeing the
community split before writing is a thumb on the scale.

## Invariants

- Submission status: `pending → judged → seen`. Home badges off `judged`.
- Rating is null in v1. Profile renders streak + accuracy when null.
- Player counts below `POPULATION_THRESHOLD` render "You're early", never a
  raw number.
- Scoring is conditional on evidence drawn. Never penalise an unlucky draw.
- One accent per meaning: white = action, blue = your data, amber =
  divergence, green/red = outcome.
- Opponent prose is never generated. Verdicts may be simulated; arguments
  come from `data/archive/seed-arguments.json` and are labelled in the UI as
  "compared against the case archive".
- Rating is never attached to an archive match.

## Conventions

- TypeScript strict. No `any` in `engine/`. `any` tolerated in `screens/`.
- Engine functions are pure and unit-tested. No React imports in `engine/`.
- Tailwind only. No inline styles except dynamic widths.
- Cases are JSON in `data/cases/`. Never hardcode case content in a component.
- Tokens live in `styles/tokens.css` under `@theme` (Tailwind v4 is
  CSS-first — there is no `tailwind.config.ts`).

## Case-writing rules (§6 — the actual bottleneck)

1. No single evidence item decides the case. Every item is weight 1 or 2;
   decisiveness comes from a *combination*.
2. Teasers must not leak payloads. "Sent by HR at 17:02", not "contains the
   termination instructions".
3. Benchmark balance: no more than 55% of cases lean the same direction.
   The ledger is a comment at the top of `data/cases/index.ts` — update it.
4. Ambiguity must be real. Target community split 45–70%.
5. Self-contained jurisdiction. Every case states its own rule.
6. Scenario 150–250 words. Evidence bodies under 120 words.
7. The scenario must contain one detail that feels irrelevant and isn't.

`validateCase()` enforces 1, 4, 6 and the split/posture consistency
automatically — it runs in the test suite and warns in dev. Rules 2, 3 and 7
are human judgement.

## Commands

```bash
npm run dev      # vite --host, for phone testing on the LAN
npm test         # vitest — engine + case data, no browser needed
npm run build    # tsc -b && vite build
```

## Where the judging happens

`JUDGING_DELAY_MS` in `engine/pairing.ts` is **3 hours**. The delay is the
return hook — the async design exists to make the player come back to
something. To walk the whole loop in one sitting, put
`VITE_JUDGING_DELAY_MS=20000` in `.env.local`. It is honoured only when
`import.meta.env.DEV`, so a production build can never ship at 20 seconds.

## Motion

- Durations and easings live in `lib/motion.ts`. No inline durations.
- Motion belongs in `components/motion/` and screen-level wrappers. Do not
  scatter `motion.div` through business logic.
- `MotionConfig reducedMotion="user"` wraps the app: opacity survives,
  transforms drop.
- Never pass `initial={false}` to the route `AnimatePresence`. It propagates
  to the whole subtree and silently kills every mount-time entrance on the
  first screen rendered.
- The pending-result pulse is CSS (`.pulse-dot`), not JS. It is the only
  indefinite loop in the app.
- `haptic()` is a no-op in Safari on iOS — there is no vibration API there.
  Visual press response carries the whole tactile channel on iPhone, so
  every interactive element gets a press scale. Show the haptics toggle only
  when `hapticsSupported()`.

## Atmosphere — the line

Allowed: 1px accent borders on active cards, the scroll hairline, paced
typography (`prose-scenario`).

Not allowed without an explicit instruction: gradients on cards, background
patterns, parallax, confetti, particles, glow, glassmorphism, animated
backgrounds, page-load logo animations.

## Phase B rules

- Flags live in `config/features.ts`, read through `useFeature()`. Never
  read `FEATURES` directly in a component.
- A flag can only *disable*. A gated feature (`rating`, `liveOpponents`,
  `liveJury`) stays shut until its population gate in `engine/population.ts`
  is met, whatever the flag or `?ff=` says.
- Flag false must mean *exactly* Phase A behaviour, tests included.
- Cloud sync is write-through: localStorage stays the source of truth for
  play, and nothing in `state/sync.ts` is ever awaited on the play path.
- Merging local and remote state derives counters from the merged
  submissions; it never sums them. See `state/merge.ts`.
- No jury view may resolve an argument to a player identity. The only path
  from a juror to an argument is the `jury_queue` view in
  `supabase/schema.sql`, which does not project `player_id`.

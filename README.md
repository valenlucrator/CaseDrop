# CaseDrop

Short-form legal reasoning game. One case a day: read the scenario, open two
of five evidence items, commit to a decision, defend it in sixty words. The
community split lands after you have written. The verdict on your argument
arrives on a later app open.

Mobile web, 390×844 target. React 19 + TypeScript + Vite + Tailwind v4.

## Run it

```bash
npm install
npm run dev -- --host   # prints a LAN address for phone testing
npm test                # engine + case data, no browser needed
npm run build
```

`--host` is the one that matters. Chrome DevTools device mode is fine for
layout but lies about the bottom safe area, how the keyboard shifts the
Argument screen, and how the greys read on OLED at low brightness.

## What's in v1

Three tabs — Home, Jury, Profile. Three cases. Twelve hand-written opponent
arguments. localStorage persistence, no backend, no accounts. Deploys as a
static bundle.

The play flow is `Intro → Evidence → Decision → Argument → CommunityReveal
→ Jury`. The result is not on that path: it is a second entry point from
Home, reached on a later open, because a submission has a lifecycle
(`pending → judged → seen`) rather than a position.

## Layout

```
src/
├─ types/          Case, Evidence, Benchmark, PlayerState, Submission
├─ data/
│  ├─ cases/       one JSON per case + typed index with validation
│  └─ archive/     human-written opponent arguments
├─ engine/         pure, unit-tested, no React
│  ├─ scoring.ts   the five components of a ScoreBreakdown
│  ├─ pairing.ts   same-evidence matching, jury simulation
│  ├─ rating.ts    Elo, gated off in v1
│  └─ population.ts  the cold-start threshold
├─ state/          reducer + localStorage + two contexts
├─ screens/        eleven screens
├─ components/     TabBar, SplitBar, EvidenceRow, PlayerCount, …
└─ styles/         design tokens as Tailwind v4 @theme
```

## Things that are deliberate

**Rating is `null`.** Not zero, not 1200 — null. Profile reads
`rating === null` and renders streak and accuracy instead of a ladder. One
field turns the whole thing on later.

**Opponent arguments are written by hand.** Verdicts are simulated; prose
never is. LLM-generated 60-word legal arguments are detectable within five
cases, and detection collapses "did I out-argue a person" into "did I please
a grader" — which is the exact fantasy the product is built on. The UI says
"compared against the case archive" because that is what is happening.

**Counts below 50 render "You're early".** Shipping "3 jurors voted"
announces that the app is empty.

**Evidence scoring is conditional on the draw.** Full marks are reachable
with a weak pair. A player is never penalised for evidence they did not get.

**The decision screen keeps the evidence reachable.** Three minutes is short,
but not short enough to hold a scenario in working memory while committing
to it irreversibly.

## Motion

The app reads as a game rather than a form because of response, not
decoration. Timings live in `lib/motion.ts`; nothing inlines a duration.

The pieces that matter: every interactive element compresses on press;
refusing the third evidence tap shakes the row and says why; the three items
you did not pick visibly lock; committing a decision runs a ~690ms sequence
you cannot rush; community percentages tick up from zero rather than fading
in; and the pending-result dot on Home is the only thing in the app that
loops forever.

`prefers-reduced-motion: reduce` drops every transform and keeps the fades.

**Haptics are Android-only.** `navigator.vibrate` does not exist in Safari on
iOS and there is no shim. `haptic()` is called at every interaction anyway —
free on Android, silent on iPhone — and the settings toggle is hidden where
it would do nothing. On iOS the visual press response is the whole tactile
channel, which is why it is on every control rather than the important ones.

## Phase B — built, dormant

Accounts, cloud sync, live opponents, rating, Learn and Groups are written
and switched off in `src/config/features.ts`. Every flag is `false`, and with
all of them false the app behaves exactly as it did before they existed.

Two rules make that safe:

**A flag can only disable.** `rating`, `liveOpponents` and `liveJury` sit
behind population gates in `engine/population.ts`. No flag and no `?ff=`
query param can force one open below its threshold — that asymmetry is the
guard against a ladder with eleven people on it.

**Nothing in Phase B is on the play path.** localStorage stays the source of
truth; sync is write-through and never awaited during a session, so the app
stays fully playable with the network down.

The Supabase schema and its row-level security live in
`supabase/schema.sql`, written before the client code because the access
rules *are* the design. The load-bearing one: a juror can never reach a
player identity from an argument. There is no policy granting read access to
another player's submission row at all — jurors see arguments only through
the `jury_queue` view, which does not project `player_id`.

## Before you ship it to testers

`JUDGING_DELAY_MS` is three hours. The delay *is* the return hook — the whole
async design exists to make the player come back to something.

To walk the loop in one sitting, put `VITE_JUDGING_DELAY_MS=20000` in
`.env.local` (see `.env.example`). It is honoured only when
`import.meta.env.DEV` is true, so a production build cannot ship at 20
seconds even by accident.

## Deploy

Static build, no server. Connect the repo to Vercel; every push to `main`
publishes. That URL is what goes to testers — no install, no TestFlight, no
Apple Developer account.

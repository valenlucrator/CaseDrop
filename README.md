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

## Before you ship it to testers

`JUDGING_DELAY_MS` in `engine/pairing.ts` is 20 seconds so a watched session
can reach the result screen. Real behaviour is three hours. Raise it (or
flip `LIVE_PAIRING`) before sending the link to anyone you are not sitting
next to — the delay *is* the return hook.

## Deploy

Static build, no server. Connect the repo to Vercel; every push to `main`
publishes. That URL is what goes to testers — no install, no TestFlight, no
Apple Developer account.

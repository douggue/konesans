# Konesans — app logic

Core game and learning logic for the Haitian kids' quiz app, plus the Nakama server module that runs 1v1 duels.
The UI (Expo / React Native) is not here yet; everything in `packages/core` is framework-free so the app and the server share one implementation.

```
konesans/
├── packages/core/          @konesans/core — pure TypeScript, 29 tests
│   └── src/
│       ├── types.ts            Question, Profile, KidSettings, Progress …
│       ├── content/            sample question bank, offline pack manifest + validator
│       ├── quiz/engine.ts      question selection (age/category/seen/review), scoring, solo session
│       ├── quiz/math.ts        Kalkil Mantal (60-second mental math)
│       ├── duel/match.ts       authoritative 1v1 state machine + publicView (hides answers)
│       ├── duel/bot.ts         bot opponent (human-like timing, adaptive accuracy)
│       ├── progress/           xp/levels, streak (gentle), daily quests, spaced repetition, badges
│       ├── safety/             generated usernames, parent gate + consent, report/block, matchmaking filter
│       └── sync/events.ts      offline-first event log: merge + fold → Progress
└── server/
    ├── nakama/src/main.ts  match handler `duel`, RPCs find_duel / sync_progress / consent_confirm / report_player
    └── docker-compose.yml  Postgres + Nakama, one command
```

## Run

```bash
npm install
npm test                 # core tests
npm run build            # core → dist, nakama → server/nakama/build/index.js
cd server && docker compose up   # Nakama on :7350, console on :7351
```

## How the pieces fit

**Quiz.** `selectQuestions(bank, {age, category, count, seed, exclude, prefer})` returns approved questions for the age band, review items first, unseen next, options shuffled. `scoreAnswer` gives 10 base + up to 5 for speed + combo bonus; hints halve it. `startSolo/answerSolo` is the solo session.

**Duel.** `createDuel → reduce(state, command, now)`. Commands: `join`, `answer`, `react`, `leave`, `tick`. The server runs `tick` 5×/s. Phases `lobby → question → reveal → … → ended`. Scoring happens at reveal, so nothing a client sends can change the key. `publicView(state, viewerId)` is the only thing sent to clients: it hides the answer during a question and the opponent's choice until reveal. Reactions are an allow-list; free text is impossible.

**Bot.** If nobody joins within 10 s, the Nakama loop adds a bot (`planBotAnswer`) with age-based accuracy and 3–9 s response time. `adaptBot` nudges accuracy toward a ~55 % kid win rate.

**Progress.** `recordActivity` handles streaks with local-day math (Port-au-Prince or wherever the kid is), one freeze per 7 days, and **turns fully off** when a parent disables streaks. `moodFor` and `canRemind` are the gentle rules: at most one reminder per day, nothing after bedtime. `dailyQuests(userId, day)` is deterministic so phones agree offline. `noteWrong/noteReviewed/dueReviews` is a 5-box Leitner system.

**Safety.** `generateUsername` is the only way to get a name (`isValidUsername` rejects typed ones). `makeGate` is the worded-math parent gate; `newConsent` records what we collect; `canUseOnline` requires `confirmedAt`, which only the server sets after the parent clicks the link. `report` blocks immediately; `canMatch` enforces same age band, parent permission, confirmed consent, no blocks.

**Offline.** The app appends `SyncEvent`s locally and uploads them with `sync_progress`. `mergeLogs` is a union by id (safe to retry, safe across two devices). `foldProgress` rebuilds Progress from the log, so the server never trusts a client-computed total.

## What's next (in order)

1. **Expo app** screens wired to `@konesans/core` (Home, Categories, Duel, Lesson, Reward) using the mockup as spec.
2. **Content pipeline**: admin upload of packs → `content` storage collection; CDN for pack files; `validatePack` on upload.
3. **Consent web endpoint**: the WhatsApp/email link that calls `consent_confirm` after validating a signed token.
4. **Courses/lessons** engine (Duolingo-style exercise types) — not started here.
5. **Classroom mode**: a `class` match type that fans one teacher's questions out to a room code.

## Notes
- Nakama JS runtime is ES5 (goja); the rollup config targets ES5 and bundles core in. Don't use `Intl` in server code paths (streak math runs on device; the server only folds events).
- Default `KidSettings` are the safest: random duels off, 1 reminder/day, bedtime 20:00.

## Language courses (`packages/core/src/courses/`)

Two courses, **Angle** (en) and **Panyòl** (es), built from one shared content set so they stay in sync:

- `content.ts` — 154 concepts (`ht` / `en` / `es`, optional picture key, accepted alternatives) and 65 sentences, arranged in 11 units / 26 lessons: Salitasyon, Fanmi, Nimewo, Koulè, Lekòl, Manje, Kò mwen, Bèt, Jou ak tan, Aksyon, Kesyon ak kote.
- `engine.ts` — `buildLesson(lang, lessonId, age)` generates ~10–13 exercises per lesson from 7 kinds: pick_meaning, pick_word, listen_pick, match_pairs, translate_pick, build_sentence, fill_blank. Ages 6–8 get pictures + listening and only short sentence builders; 12–14 get three sentence builders and a fill-in-the-blank. Every word in the lesson is drilled at least once.
- `startLesson / answerLesson / finishLesson` — no hearts: a wrong answer is re-asked once at the end. XP = 10 + 2 per first-try correct (+10 perfect); stars 1–3; emits the same `lesson_done` event the quests use.
- `coursePath / nextLesson / courseSummary / recordLesson` — linear unlock, best stars kept, words-learned count.
- Audio for target words is `tts:en:<text>` / `tts:es:<text>` → resolve with `expo-speech` on device (free, good quality for EN/ES). Kreyòl prompts are text only.

Tests: `packages/core/test/courses.test.ts` sweeps every lesson × language × age × 3 seeds for well-formed exercises.

## Mobile app (`apps/mobile/`)

Expo SDK 58 + expo-router + TypeScript, wired to `@konesans/core`. Runs offline; the server sync (Nakama) plugs in later.

- `app/` — routes: onboarding, home, categories, quiz/[category], duel (vs Robo, same reducer as the server), course + course/[lang]/[lesson] (all 7 exercise kinds), coding + coding/[level] (block programs with nested repeat / if / until), profile, settings.
- `src/lib/` — theme (design tokens), i18n (Kreyòl + French UI strings), store (zustand + AsyncStorage: profile, progress, course progress, coding stars, settings), audio (device TTS for EN/ES, haptics), content (question supply: bank + generated modules).
- `src/ui/` — UI kit (chunky cards/buttons, option buttons, top bar, bottom nav, sheet, Ti Zwazo mascot, flag/shape media) and the 64-icon SVG set.

```bash
npm install
npm run build -w @konesans/core
cd apps/mobile
npx expo start            # scan the QR with Expo Go on a phone
npx tsc --noEmit          # type-check
npx expo export --platform web --output-dir dist   # web build (what the preview link runs)
```

## Kalkil Mantal engine (`packages/core/src/quiz/math.ts`)

20 problem kinds, chosen by age band with weights; every answer is an integer typed on a number pad:
- **6–8:** add/sub to 20, double, half, missing number (`? + 3 = 8`), sequences.
- **9–11:** add/sub to 100, tables to 12, exact division, missing factor, order of operations (`31 − 8 × 2`), squares, easy percentages (10/25/50 %), one-step equations, unit conversions.
- **12–14:** everything above plus two-step equations (`9x + 5 = −13`, `3(x − 2) = 15`), negatives, powers (`3⁴`), square roots, remainders, fractions of (`5/8 nan 80`), averages, differences, parentheses.
Hard kinds are worth 2 points; a 5-streak doubles points; `skipMath` skips at the cost of the combo; `weakKinds` powers the "Pratike" tip at the end. `test/math.test.ts` re-solves every generated problem independently (20 kinds × 3 ages × 200 seeds).

## World table + Peyi options (`packages/core/src/content/world.ts`, `modules/countries.ts`)

197 countries (193 UN members + Vatican, Palestine, Kosovo, Taiwan) with Kreyòl name, capital, region, difficulty tier (1 famous / 2 school atlas / 3 hard), area, main language and currency. `content/shapes.ts` holds Natural Earth outlines for 179 of them (micro-states and atolls that would be a dot are left out; `hasShape` gates the shape quiz). Regenerate with `scratch/ne/gen-world.mjs`.

`generateCountryQuiz({ mode: 'drapo'|'kapital'|'fom', level: 1|2|3, region: <region>|'mond' }, age, count, seed)` builds a Peyi set: level = max tier (small regions open the next tier when fewer than 4 countries qualify); level 1 distractors are famous countries from anywhere, levels 2–3 prefer the same continent; levels 2–3 (or small pools) add reverse questions (capital → country, country → pick the flag). `countryPool` reports how many countries a combination has. ⚠ Kreyòl spellings of names and capitals need a native-speaker review.

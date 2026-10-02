# French Fluency Trainer Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox syntax for tracking.

**Goal:** Build a mobile-first React application on GitHub Pages that guides a learner through daily French fluency exercises, persists progress locally, and loads all exercise content from editable static JSON files.

**Architecture:** The app is a Vite + React + TypeScript single-page application with three top-level views: Home, Training, and Progress. It uses hash-based routing for GitHub Pages reliability. Static training content comes from typed JSON files, while progress and in-progress sessions are stored under one versioned localStorage root key. Timing logic is centralized in a timestamp-based timer hook so tab switching and refresh recovery remain accurate.

**Tech Stack:** React, TypeScript, Vite, React Router with HashRouter, Vitest, React Testing Library, plain CSS, localStorage, GitHub Actions, GitHub Pages.

## Global Constraints

- No backend, database, account, authentication, cloud sync, speech recognition, AI dependency, social features, or notifications in V1.
- Deploy under the GitHub Pages repository path /fr/.
- All pedagogical content lives in static JSON files and can be expanded without changing application logic.
- All personal progress stays in localStorage.
- Mobile-first UX is the priority.
- During training, navigation and visual clutter are minimized.
- Timers derive remaining time from timestamps, not only one-second decrements.
- In-progress sessions recover after refresh when possible.
- Content selection avoids duplicates inside a session and avoids recently used items when possible.
- If the dataset is too small, recency exclusion is relaxed rather than blocking.
- Default weekly goal: 5 completed sessions.
- Paraphrase: 5 words, 60 seconds each.
- Surprise questions: 3-second reveal countdown and 60-second speaking timer.
- 4→3→2: 240, 180, 120 seconds plus a 60-second transfer round.
- localStorage root key: fr-fluency-trainer.
- Storage schema is versioned.
- If localStorage is unavailable, training continues in memory and a non-blocking warning is shown.

---

### Task 1: Scaffold the React application and shell

**Files**
- Create package.json
- Create vite.config.ts
- Create tsconfig.json, tsconfig.app.json, tsconfig.node.json
- Create index.html
- Create src/main.tsx
- Create src/app/App.tsx
- Create src/app/App.test.tsx
- Create src/styles/global.css
- Create src/test/setup.ts
- Create .gitignore

**Interfaces**
- Produces App root component.
- Produces hash routes for /, /training, and /progress.
- Produces Vite build configured with base /fr/.
- Produces Vitest + Testing Library environment.

- [ ] Step 1: Add a failing routing test for Home, Progress navigation, and fallback to Home.
- [ ] Step 2: Run npm test -- --run src/app/App.test.tsx and confirm failure because the app does not exist.
- [ ] Step 3: Implement React, TypeScript, Vite, HashRouter, placeholder Home/Training/Progress views, global mobile-first CSS, jsdom test setup, and npm scripts dev/build/test/test:watch/preview.
- [ ] Step 4: Run the focused App test and confirm all routing tests pass.
- [ ] Step 5: Run npm run build and confirm dist is produced with asset paths rooted at /fr/.
- [ ] Step 6: Commit with message feat: scaffold fluency trainer app.

---

### Task 2: Add static JSON content and selection engine

**Files**
- Create src/data/topics.json
- Create src/data/questions.json
- Create src/data/paraphrase-words.json
- Create src/data/native-expressions.json
- Create src/types/content.ts
- Create src/services/content/contentRepository.ts
- Create src/services/content/selectContent.ts
- Create src/services/content/selectContent.test.ts

**Interfaces**
- Produces Topic, Question, ParaphraseWord, NativeExpression types.
- Produces ContentRepository readonly arrays.
- Produces selectUniqueItems(items, count, recentIds).
- Produces buildSessionContent(repository, recent).

- [ ] Step 1: Add failing tests proving unique selection, recent exclusion, relaxed recency when data is small, and no duplicate IDs.
- [ ] Step 2: Run the focused content test and confirm failure.
- [ ] Step 3: Add initial JSON seed data: at least 6 topics, 15 questions, 15 paraphrase words, and 9 natural expressions across varied categories.
- [ ] Step 4: Implement the selector. Remove duplicate source IDs defensively, prefer fresh items, then fill from recent non-selected items if needed, never duplicate within one result.
- [ ] Step 5: Run focused tests and npm run build.
- [ ] Step 6: Commit with message feat: add static training content.

---

### Task 3: Implement versioned local persistence and progress calculations

**Files**
- Create src/types/progress.ts
- Create src/services/storage/storage.ts
- Create src/services/storage/storage.test.ts
- Create src/services/progress/progress.ts
- Create src/services/progress/progress.test.ts

**Interfaces**
- Produces AppStateV1.
- Produces loadAppState and saveAppState.
- Produces createInitialState.
- Produces recordCompletedSession.
- Produces calculateCurrentStreak, calculateLongestStreak, calculateWeeklyProgress, calculateTotalPracticeMinutes.

**Persisted V1 fields**
- version
- sessions
- weeklyTests
- nativeExpressionExamples
- recentTopicIds
- recentQuestionIds
- recentWordIds
- recentExpressionIds
- inProgressSession

**Recent windows**
- topics: 4
- questions: 15
- words: 15
- expressions: 9

- [ ] Step 1: Add failing tests for missing storage, valid V1 state, malformed JSON fallback, setItem failure, streaks, weekly progress, and total minutes.
- [ ] Step 2: Run focused storage/progress tests and confirm failure.
- [ ] Step 3: Implement the root key exactly as fr-fluency-trainer and local calendar date strings for streak calculations.
- [ ] Step 4: Make failures return usable in-memory state plus a warning instead of throwing.
- [ ] Step 5: Run focused tests, then the complete test suite.
- [ ] Step 6: Commit with message feat: persist training progress.

---

### Task 4: Build the timestamp-based timer engine

**Files**
- Create src/hooks/useCountdownTimer.ts
- Create src/hooks/useCountdownTimer.test.tsx
- Create src/components/Timer/Timer.tsx
- Create src/components/Timer/Timer.test.tsx
- Create src/components/Timer/Timer.css

**Interfaces**
- Input: durationSeconds, optional persisted snapshot, optional onComplete.
- State: remainingSeconds and status idle/running/paused/finished.
- Actions: start, pause, resume, reset.
- Snapshot fields: status, durationSeconds, endAt, remainingWhenPaused.

- [ ] Step 1: Add failing tests with fake timers for wall-clock accuracy, pause, resume, refresh restoration, expired restoration, and one-time completion callback.
- [ ] Step 2: Run focused timer tests and confirm failure.
- [ ] Step 3: Implement Date.now as the source of truth; the interval only triggers rerenders.
- [ ] Step 4: Build Timer UI showing MM:SS plus Start/Pause/Resume and compact reveal-countdown mode.
- [ ] Step 5: Run focused tests then the full suite.
- [ ] Step 6: Commit with message feat: add resilient countdown timer.

---

### Task 5: Implement the guided four-exercise training session

**Files**
- Create src/features/training/types.ts
- Create src/features/training/sessionReducer.ts
- Create src/features/training/sessionReducer.test.ts
- Create src/features/training/TrainingPage.tsx
- Create src/features/training/TrainingPage.test.tsx
- Create src/features/training/components/SessionHeader.tsx
- Create src/features/training/components/Fluency432Exercise.tsx
- Create src/features/training/components/ParaphraseExercise.tsx
- Create src/features/training/components/SurpriseQuestionsExercise.tsx
- Create src/features/training/components/NaturalFrenchExercise.tsx
- Create src/features/training/components/SessionReview.tsx
- Create src/features/training/training.css
- Modify src/app/App.tsx

**Behavior**
- Create selected session content once and persist IDs immediately.
- Resume existing session after refresh.
- 4→3→2 uses 240, 180, 120, then 60-second transfer.
- After the first 4-minute round, capture missing word, difficult phrase, and important error.
- Paraphrase shows 5 unique words, 60 seconds each, with rescue phrases and Finish Early.
- Surprise questions hide each prompt during 3→2→1, then reveal it for 60 seconds.
- Skip is allowed and skipped IDs still count as seen.
- Natural French shows 3 expressions and stores 3 personal examples for each.
- Review captures block count, successful paraphrase, expression to reuse, error to watch, and fluency score 1–5.
- Review clears inProgressSession only after successful completion.
- Recent IDs update only on completion.

- [ ] Step 1: Add failing reducer and page integration tests for the complete state machine and refresh recovery.
- [ ] Step 2: Run the focused training tests and confirm failure.
- [ ] Step 3: Implement reducer-driven session state and all four exercise components.
- [ ] Step 4: Implement end review. Require nonnegative block count and fluency score 1–5; other reflection text may be empty.
- [ ] Step 5: Run focused tests, full tests, and npm run build.
- [ ] Step 6: Commit with message feat: add guided daily training session.

---

### Task 6: Build Home, Progress, weekly test, and polished responsive UI

**Files**
- Create src/features/home/HomePage.tsx
- Create src/features/home/HomePage.test.tsx
- Create src/features/home/home.css
- Create src/features/progress/ProgressPage.tsx
- Create src/features/progress/ProgressPage.test.tsx
- Create src/features/progress/WeeklyTest.tsx
- Create src/features/progress/WeeklyTest.test.tsx
- Create src/features/progress/progress.css
- Create src/components/Layout/AppShell.tsx
- Create src/components/Layout/layout.css
- Modify src/app/App.tsx
- Modify src/styles/global.css

**Home**
- Start or Resume Session CTA.
- Current streak.
- Total practice minutes.
- Completed sessions.
- Weekly x / 5 progress.
- Exercise list: 4→3→2 12 min, Paraphrase 5 min, Questions surprise 8 min, Français naturel 5 min.

**Progress**
- Current and longest streak.
- Total minutes and sessions.
- Recent sessions with date, duration, block count, fluency score.
- Empty state when no sessions exist.
- Weekly test comparison.

**Weekly test**
- Offered once per calendar week.
- New unseen topic when possible.
- 3-minute spontaneous timer.
- Fields: start delay, long pauses, major fillers, successful paraphrases, abandoned sentences, longest fluent segment.
- Persist one result per week.

**UI**
- Single-column phone layout.
- Constrained centered desktop layout.
- Touch targets at least 44px.
- Large countdown typography.
- Lightweight transitions.
- Respect prefers-reduced-motion.
- System fonts only.
- During training, hide normal navigation and show only session progress plus exit action.
- Exiting preserves the unfinished session.

- [ ] Step 1: Add failing Home, Progress, and WeeklyTest tests.
- [ ] Step 2: Run focused feature tests and confirm failure.
- [ ] Step 3: Implement dashboard, progress history, weekly comparison, and responsive styling.
- [ ] Step 4: Verify focused tests.
- [ ] Step 5: Run full tests and npm run build.
- [ ] Step 6: Commit with message feat: add dashboard and progress tracking.

---

### Task 7: Add GitHub Pages deployment and documentation

**Files**
- Create .github/workflows/deploy-pages.yml
- Create README.md
- Create src/app/smoke.test.tsx
- Modify package.json only if a final CI alias is needed.

**Workflow**
- Trigger on push to main and manual dispatch.
- Checkout.
- Setup Node.
- npm ci.
- npm test -- --run.
- npm run build.
- Configure Pages.
- Upload dist with the official Pages artifact action.
- Deploy with the official Pages action.
- Set Pages permissions and concurrency.

**README**
- Explain purpose and exercises.
- Local setup commands.
- JSON file locations and schemas.
- How to add new topics, questions, words, and expressions.
- IDs must stay unique because recency/history depend on them.
- localStorage privacy note.
- Expected Pages URL: https://brahmiamine.github.io/fr/

- [ ] Step 1: Add a smoke test that loads Home, starts a session, reaches Training, and renders selected content through hash routing.
- [ ] Step 2: Run the smoke test and correct any provider/routing gap.
- [ ] Step 3: Add GitHub Pages workflow and README.
- [ ] Step 4: Run the smoke test.
- [ ] Step 5: Run npm ci && npm test -- --run && npm run build; confirm dist/index.html exists and built assets use /fr/.
- [ ] Step 6: Commit with message ci: deploy fluency trainer to github pages.

---

## Unresolved Product Decisions

None that change the implementation-plan structure. The validated design and prior examples already establish the V1 defaults used here: 5 sessions per week, 5 paraphrase words over 5 minutes, 5 surprise questions at 60 seconds each, and the 4→3→2 plus 1-minute transfer timing.

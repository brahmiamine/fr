# French Fluency Trainer — Design Spec

Date: 2026-10-02
Repository: brahmiamine/fr

## Goal

Build a fast, modern, mobile-first React application that helps a learner improve spoken French fluency with one guided daily session. The primary goal is to reduce speaking blocks, improve spontaneous speech, strengthen paraphrasing, and progressively make spoken French sound more natural.

The application must work fully on GitHub Pages with no backend.

## Product principles

- Very simple and fast UI.
- Mobile-first.
- One clear action per screen.
- No account required.
- Progress stored locally with localStorage.
- Exercise content stored in static JSON files committed to the repository.
- Content can be expanded over time without changing application code.
- The app guides the learner through timings automatically.
- The training flow should minimize cognitive overload while speaking.

## Daily training flow

A daily session is composed of 4 exercises.

### 1. 4 → 3 → 2 Fluency Drill

Goal: automate language retrieval and reduce hesitation.

Flow:
1. Select one topic from topics.json.
2. Show topic, prompts, rules, and a Start button.
3. Round 1: 4-minute countdown.
4. Short reflection screen:
   - missing word
   - difficult phrase
   - important error
5. Round 2: 3-minute countdown.
6. Round 3: 2-minute countdown.
7. Transfer round: 1 minute on a related but different prompt.

Rules:
- Do not stop to self-correct.
- If a word is missing, paraphrase.
- Do not stay silent longer than about 2 seconds.

### 2. Forbidden Word / Paraphrase

Goal: keep speaking when a specific word is unavailable.

Flow:
- Select 5 words from paraphrase-words.json.
- One card at a time.
- Learner must explain the word without saying it.
- Timer per word.
- Next-word action.
- Recent words should not be repeated too frequently.

Suggested rescue structures displayed when needed:
- C’est quelque chose qui…
- Ça sert à…
- C’est une sorte de…
- C’est quand…
- C’est comme…, sauf que…

### 3. Surprise Questions

Goal: start speaking quickly and build ideas while speaking.

Flow:
- Select 5 questions from questions.json.
- Before every question, show a 3 → 2 → 1 countdown.
- Reveal the question only when countdown finishes.
- Speaking timer: configurable default of 60 seconds.
- User can skip or finish early.
- Show optional rescue starters:
  - Alors, je dirais que…
  - Je pense qu’il y a plusieurs raisons…
  - À mon avis, ça dépend surtout de…
  - Le principal point, c’est que…

### 4. Natural French

Goal: transform correct French into more natural spoken French.

Flow:
- Select 3 expressions from native-expressions.json.
- For every expression, show 3 personal sentence inputs.
- Encourage using at least 2 expressions during other exercises.
- Save user-created examples locally.

## End-of-session review

At the end of a session, ask the learner to record:
- number of real speaking blocks
- one successfully paraphrased word
- one expression to reuse tomorrow
- one error to watch
- personal fluency score from 1 to 5

Store the completed session locally.

## Weekly test

Once per week, offer a 3-minute spontaneous test on a new topic.

Track:
- time before starting
- long pauses
- major fillers
- successful paraphrases
- abandoned sentences
- longest fluent segment

The app should compare this week with prior weeks.

## Home screen

Main screen should show:

- Greeting / training CTA
- Start daily session
- Current streak
- Total practice minutes
- Completed sessions
- Weekly goal
- Today’s exercise list and estimated duration
- Small weekly progress visualization

Example:

- 4 → 3 → 2 — 12 min
- Paraphrase — 5 min
- Surprise questions — 8 min
- Natural French — 5 min

## Navigation

Keep navigation minimal.

Primary views:
- Home
- Training session
- Progress

During a session, hide unnecessary navigation and focus on the current task.

## UI direction

- Modern, clean, minimal interface.
- Large central exercise card.
- Large circular or prominent countdown timer.
- Clear session progress indicator such as 2/4.
- Strong Start / Pause / Continue / Finish buttons.
- Smooth but lightweight transitions.
- Responsive layout optimized for Android phones first, desktop second.
- Accessible contrast and touch targets.
- Avoid visual clutter.

## Static content architecture

Use separate JSON files:

src/data/topics.json
src/data/questions.json
src/data/paraphrase-words.json
src/data/native-expressions.json

### topics.json

Each item:

{
  "id": "t001",
  "title": "Télétravail ou bureau ?",
  "category": "travail",
  "difficulty": "medium",
  "prompts": [
    "Quel est ton choix personnel ?",
    "Quels sont les avantages ?",
    "Quels sont les inconvénients ?",
    "Donne un exemple personnel."
  ],
  "transferPrompt": "Une semaine de quatre jours serait-elle meilleure ?"
}

### questions.json

Each item:

{
  "id": "q001",
  "text": "Pourquoi certaines personnes préfèrent-elles vivre seules ?",
  "category": "societe",
  "difficulty": "medium"
}

### paraphrase-words.json

Each item:

{
  "id": "w001",
  "word": "embouteillage",
  "category": "quotidien",
  "difficulty": "easy"
}

### native-expressions.json

Each item:

{
  "id": "e001",
  "expression": "Ça dépend vraiment de...",
  "category": "nuancer"
}

## Local storage

No backend and no authentication.

Store:
- completed sessions
- total practice minutes
- current streak
- longest streak
- weekly progress
- weekly test measurements
- user-created example sentences
- recent topic IDs
- recent question IDs
- recent word IDs
- recent expression IDs
- current in-progress session

Suggested root key:
fr-fluency-trainer

The data model should be versioned to allow future migrations.

## Content selection

The content engine should:
- randomly select items
- avoid recently used items
- avoid duplicates inside the same session
- fall back gracefully when the JSON dataset is still small
- support future filtering by category and difficulty

## Timer behavior

Timers must:
- be accurate after tab switching or screen sleep by calculating against timestamps instead of only decrementing state every second
- support pause/resume
- clearly indicate when time is finished
- automatically persist in-progress state locally
- recover after refresh when reasonable

## Technical architecture

Stack:
- React
- TypeScript
- Vite
- CSS with lightweight reusable components
- localStorage
- GitHub Actions
- GitHub Pages

No backend.
No database.
No authentication.
No AI dependency in V1.

Suggested source structure:

src/
  app/
  components/
  features/
    home/
    training/
    progress/
  hooks/
  services/
    storage/
    content/
  data/
  types/
  styles/

Keep feature components small and isolated.

## GitHub Pages deployment

Use a GitHub Actions workflow that:
1. installs dependencies
2. builds the Vite application
3. uploads the Pages artifact
4. deploys to GitHub Pages

Configure Vite base correctly for the repository path /fr/.

## Error handling

- If static JSON fails to load, show a clear recoverable error.
- If localStorage is unavailable, allow training in memory with a warning.
- If a timer is interrupted, recover using persisted timestamps.
- If all content is marked recent, relax the recent-content exclusion rather than blocking the session.

## Testing

Minimum coverage:
- content selection avoids duplicates
- recent-content exclusion works
- localStorage persistence and migration
- timer pause/resume
- timer recovery after refresh
- streak calculation
- session completion
- progress aggregation

Use a lightweight test setup suitable for Vite/React.

## V1 scope

Included:
- Home
- Guided four-exercise session
- Timers
- Static JSON content
- Local persistence
- Streak and practice stats
- Progress view
- Weekly test
- GitHub Pages deployment
- Responsive modern UI

Not included in V1:
- account/login
- cloud sync
- backend
- speech recognition
- AI corrections
- social features
- notifications

## Success criteria

The V1 is successful when:
- the app loads correctly from GitHub Pages
- a complete guided session can be finished on mobile
- progress survives refresh and browser restart
- timers remain reliable after tab switches
- content can be expanded only by editing JSON files
- recently used content is not repeated too often
- the interface remains simple enough to start a training session in one tap

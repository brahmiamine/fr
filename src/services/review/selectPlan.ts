import { contentRepository } from '../content/contentRepository'
import { pickInPriority, selectUniqueItems } from '../content/selectContent'
import {
  daysBetween,
  getWeekKey,
  recentProsodyFocus,
  toLocalDateString,
} from '../progress/progress'
import type { AppState } from '../../types/progress'
import type { Chunk, Question, RetellingStory, TabooTopic, Topic } from '../../types/content'
import { FOCUS_OPTIONS } from '../../features/prosody/types'
import type { GapItem, SessionMode, SessionPlan, StageKind } from '../../features/training/types'
import {
  CHUNKS_PER_SESSION,
  CONSTANT_ROUND_SECONDS,
  FLUENCY_ROUND_SECONDS,
  GAPS_PER_SESSION,
  MODE_STAGES,
  QUESTIONS_PER_SESSION,
  REPRISE_MAX_DAYS,
  REPRISE_MIN_DAYS,
  SHORT_GAPS_PER_SESSION,
  STAGE_ORDER,
  ZAPPING_QUESTIONS,
} from '../../features/training/types'

/** Every third session, the 4 → 3 → 2 retells a short story. */
export const RETELLING_EVERY_N_SESSIONS = 3

export function isRetellingDay(completedSessions: number): boolean {
  return completedSessions % RETELLING_EVERY_N_SESSIONS === RETELLING_EVERY_N_SESSIONS - 1
}

export function topicFromStory(story: RetellingStory): Topic {
  return {
    id: story.id,
    title: `Raconte : « ${story.title} »`,
    category: story.category,
    difficulty: 'medium',
    prompts: [
      'Qui ? Où ? Quand ?',
      'Quel est le problème au départ ?',
      'Comment la situation évolue-t-elle ?',
      'Comment ça se termine, et qu’en retenir ?',
    ],
    transferPrompt: story.transferPrompt,
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function personalAsChunk(state: AppState, today: string): Chunk[] {
  const reviews = new Map(state.chunkReviews.map((review) => [review.chunkId, review]))
  return state.personalChunks
    .filter((chunk) => {
      const review = reviews.get(chunk.id)
      if (review) return review.nextReview <= today
      return chunk.nextReview <= today
    })
    .map((chunk) => ({
      id: chunk.id,
      intent: chunk.intent,
      expression: chunk.expression,
      category: 'personnel',
      level: 'personnel',
    }))
}

function selectChunks(
  state: AppState,
  count: number,
  random: () => number,
): Chunk[] {
  const today = toLocalDateString()
  const staticChunks = [...contentRepository.chunks]
  const personalDue = personalAsChunk(state, today)
  const allEligible = [...staticChunks, ...personalDue]
  const byId = new Map(allEligible.map((chunk) => [chunk.id, chunk]))
  const reviewById = new Map(state.chunkReviews.map((review) => [review.chunkId, review]))

  // Learning chunks first, then mastered ones due for their monthly check.
  const due = [
    ...state.chunkReviews.filter((review) => !review.mastered && review.nextReview <= today),
    ...state.chunkReviews.filter((review) => review.mastered && review.nextReview <= today),
  ]
    .map((review) => byId.get(review.chunkId))
    .filter((chunk): chunk is Chunk => Boolean(chunk))

  for (const chunk of personalDue) {
    if (!reviewById.has(chunk.id) && !due.some((item) => item.id === chunk.id)) due.push(chunk)
  }

  const unseen = allEligible.filter((chunk) => {
    const review = reviewById.get(chunk.id)
    return !review && !state.recentChunkIds.includes(chunk.id)
  })

  const rest = staticChunks.filter((chunk) => {
    const review = reviewById.get(chunk.id)
    return !review?.mastered && !unseen.some((item) => item.id === chunk.id)
  })

  return pickInPriority<Chunk>([due, unseen, rest], count, random)
}

/** Words of the weekly circumlocution task that were not guessed, most recent test first. */
function failedParaphraseWords(state: AppState) {
  const failed = new Set(
    [...state.weeklyTests]
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((test) => test.failedParaphraseIds ?? []),
  )
  return contentRepository.paraphraseWords.filter(
    (word) => failed.has(word.id) && !state.recentWordIds.includes(word.id),
  )
}

/**
 * Personal word gaps first — every slot if enough are due ("trous de mots
 * personnels" come before new content) — the oldest first, then mastered
 * words due for their monthly check. Generic words to paraphrase fill what
 * is left, starting with the ones missed in the weekly test.
 */
export function selectGapItems(
  state: AppState,
  count: number,
  random: () => number,
  options: { personalOnly?: boolean } = {},
): GapItem[] {
  const today = toLocalDateString()
  const byDate = (a: { nextReview: string }, b: { nextReview: string }) =>
    a.nextReview.localeCompare(b.nextReview)
  const learningDue = state.wordGaps
    .filter((gap) => gap.status === 'learning' && gap.nextReview <= today)
    .sort(byDate)
  const masteredDue = state.wordGaps
    .filter((gap) => gap.status === 'mastered' && gap.nextReview <= today)
    .sort(byDate)

  const personal = [...learningDue, ...masteredDue].slice(0, count)
  const items: GapItem[] = personal.map((gap) => ({
    key: `gap-${gap.id}`,
    kind: 'retrieve',
    target: gap.target,
    context: gap.context,
    isPersonal: true,
    sourceId: gap.id,
    rescueAngles: [],
  }))
  if (options.personalOnly) return items

  const missed = failedParaphraseWords(state)
  const missedIds = new Set(missed.map((word) => word.id))
  const genericWords = [
    ...missed,
    ...selectUniqueItems(
      contentRepository.paraphraseWords.filter((word) => !missedIds.has(word.id)),
      count,
      state.recentWordIds,
      random,
    ),
  ]
  for (const word of genericWords.slice(0, count - personal.length)) {
    items.push({
      key: `word-${word.id}`,
      kind: 'paraphrase',
      target: word.word,
      context: '',
      isPersonal: false,
      sourceId: word.id,
      rescueAngles: word.rescueAngles ?? [],
    })
  }
  return items
}

/**
 * "Enfin, ce mot est réinjecté dans un futur 4→3→2 ou une question surprise":
 * every word already revealed once comes back to be used while speaking —
 * except the ones due for retrieval today, which must not be shown before
 * the learner tries to find them in the word-gap exercise.
 */
function selectFocusWords(state: AppState, random: () => number): string[] {
  const today = toLocalDateString()
  const reusable = state.wordGaps.filter((gap) => gap.nextReview > today)
  return shuffle(reusable, random)
    .slice(0, 2)
    .map((gap) => gap.target)
}


function selectDiverseQuestions(
  state: AppState,
  count: number,
  random: () => number,
  excludeIds: readonly string[] = [],
): Question[] {
  const excluded = new Set(excludeIds)
  const ordered = selectUniqueItems(
    contentRepository.questions.filter((question) => !excluded.has(question.id)),
    contentRepository.questions.length,
    state.recentQuestionIds,
    random,
  )
  const chosen: Question[] = []
  const usedCategories = new Set<string>()
  const usedTypes = new Set<string>()

  // First pass: maximize both topic category and speaking-task diversity.
  for (const question of ordered) {
    if (chosen.length >= count) break
    if (usedCategories.has(question.category) || usedTypes.has(question.type ?? 'argumentation')) continue
    chosen.push(question)
    usedCategories.add(question.category)
    usedTypes.add(question.type ?? 'argumentation')
  }

  // Second pass: keep category diversity even when every task type is already used.
  for (const question of ordered) {
    if (chosen.length >= count) break
    if (usedCategories.has(question.category) || chosen.some((item) => item.id === question.id)) continue
    chosen.push(question)
    usedCategories.add(question.category)
    usedTypes.add(question.type ?? 'argumentation')
  }

  if (chosen.length < count) {
    const selectedIds = new Set(chosen.map((question) => question.id))
    for (const question of ordered) {
      if (chosen.length >= count) break
      if (selectedIds.has(question.id)) continue
      chosen.push(question)
      selectedIds.add(question.id)
    }
  }

  return chosen
}

/**
 * "Une question ratée revient dans la pioche 3 à 7 jours plus tard": questions
 * with a big block that are due again come first.
 */
function dueReviewQuestions(state: AppState, today: string): Question[] {
  const byId = new Map(contentRepository.questions.map((question) => [question.id, question]))
  return [...(state.questionReviews ?? [])]
    .filter((review) => review.nextReview <= today)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
    .map((review) => byId.get(review.questionId))
    .filter((question): question is Question => Boolean(question))
}

function selectFluencyReminders(state: AppState, random: () => number) {
  const today = toLocalDateString()
  return shuffle(
    state.fluencyNotes.filter((note) => note.nextReview <= today),
    random,
  )
    .slice(0, 2)
    .map((note) => ({ id: note.id, kind: note.kind, text: note.text }))
}

/** The topic a session record refers to: a 4 → 3 → 2 subject or a retold story. */
export function topicById(id: string): Topic | null {
  const topic = contentRepository.topics.find((item) => item.id === id)
  if (topic) return topic
  const story = contentRepository.retellingStories.find((item) => item.id === id)
  return story ? topicFromStory(story) : null
}

/**
 * "Chaque sujet revient une fois, entre J+2 et J+7": the oldest subject in
 * that window that was not taken up again yet.
 */
export function selectRepriseTopic(state: AppState, today: string = toLocalDateString()): Topic | null {
  const reprised = new Set(
    state.sessions.map((session) => session.repriseTopicId).filter(Boolean) as string[],
  )
  const candidates = [...state.sessions]
    .filter((session) => {
      const age = daysBetween(today, session.date)
      return age >= REPRISE_MIN_DAYS && age <= REPRISE_MAX_DAYS && !reprised.has(session.topicId)
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const session of candidates) {
    const topic = topicById(session.topicId)
    if (topic) return topic
  }
  return null
}

/**
 * "Une fois par semaine, faire la version 3/3/3": the third session of the
 * week, or the first weekend session when fewer were done.
 */
export function isConstantTimeSession(state: AppState, now: Date = new Date()): boolean {
  const weekKey = getWeekKey(now)
  const thisWeek = state.sessions.filter((session) => getWeekKey(parseDate(session.date)) === weekKey)
  if (thisWeek.some((session) => session.summary?.constantTime)) return false
  if (thisWeek.length === 2) return true
  const weekend = now.getDay() === 0 || now.getDay() === 6
  return weekend && thisWeek.length > 0
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function selectTaboo(state: AppState, random: () => number): TabooTopic | null {
  const recent = state.sessions
    .slice(-12)
    .map((session) => session.tabooId)
    .filter(Boolean) as string[]
  return selectUniqueItems(contentRepository.tabooTopics, 1, recent, random)[0] ?? null
}

function skippedStagesFor(mode: SessionMode): StageKind[] {
  const kept = new Set(MODE_STAGES[mode])
  return STAGE_ORDER.filter((stage) => !kept.has(stage))
}

export function buildSessionPlan(
  state: AppState,
  random: () => number = Math.random,
  mode: SessionMode = 'full',
  now: Date = new Date(),
): SessionPlan {
  const today = toLocalDateString(now)
  const story = isRetellingDay(state.sessions.length)
    ? selectUniqueItems(contentRepository.retellingStories, 1, state.recentTopicIds, random)[0] ?? null
    : null
  const repriseTopic = mode === 'full' ? selectRepriseTopic(state, today) : null
  const exclude = repriseTopic ? [...state.recentTopicIds, repriseTopic.id] : state.recentTopicIds
  const topics = story
    ? [topicFromStory(story)]
    : selectUniqueItems(contentRepository.topics, 1, exclude, random)
  if (topics.length === 0) throw new Error('Aucun sujet de conversation disponible.')
  const topic: Topic = topics[0]
  const prosodyFocus = recentProsodyFocus(state.prosodySessions)
  const constantTime = mode !== 'short' && isConstantTimeSession(state, now)

  const questionCount = mode === 'short' ? 1 : QUESTIONS_PER_SESSION
  const zappingCount = mode === 'full' ? ZAPPING_QUESTIONS : 0
  const reviewed = dueReviewQuestions(state, today).slice(0, 1)
  const fresh = selectDiverseQuestions(
    state,
    questionCount - reviewed.length + zappingCount,
    random,
    reviewed.map((question) => question.id),
  )
  const questions = [...reviewed, ...fresh].slice(0, questionCount)
  const zappingQuestions = fresh.slice(questionCount - reviewed.length).slice(0, zappingCount)

  const chunks = selectChunks(state, CHUNKS_PER_SESSION, random)
  const chunksOfDay = shuffle(chunks, random)
  const reviewedChunks = new Set(state.chunkReviews.map((review) => review.chunkId))
  const personal = new Set(state.personalChunks.map((chunk) => chunk.id))
  const newChunkIds = chunks
    .filter((chunk) => !reviewedChunks.has(chunk.id) && !personal.has(chunk.id))
    .map((chunk) => chunk.id)

  return {
    mode,
    skippedStages: skippedStagesFor(mode),
    topic,
    roundSeconds: [...(constantTime ? CONSTANT_ROUND_SECONDS : FLUENCY_ROUND_SECONDS)],
    constantTime,
    repriseTopic,
    chunks,
    chunksOfDay,
    questions,
    zappingQuestions,
    taboo: mode === 'full' ? selectTaboo(state, random) : null,
    gapItems:
      mode === 'full'
        ? selectGapItems(state, GAPS_PER_SESSION, random)
        : mode === 'short'
          ? selectGapItems(state, SHORT_GAPS_PER_SESSION, random, { personalOnly: true })
          : [],
    focusWords: selectFocusWords(state, random),
    fluencyReminders: selectFluencyReminders(state, random),
    newChunkIds,
    retellingStory: story,
    prosodyFocusGoal:
      FOCUS_OPTIONS.find((option) => option.value === prosodyFocus)?.goal ?? null,
  }
}

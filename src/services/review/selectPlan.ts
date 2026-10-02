import { contentRepository } from '../content/contentRepository'
import { pickInPriority, selectUniqueItems } from '../content/selectContent'
import { toLocalDateString } from '../progress/progress'
import type { AppState } from '../../types/progress'
import type { Chunk, Topic } from '../../types/content'
import type { GapItem, SessionPlan } from '../../features/training/types'
import {
  CHUNKS_PER_SESSION,
  GAPS_PER_SESSION,
  QUESTIONS_PER_SESSION,
} from '../../features/training/types'

const PERSONAL_GAP_RATIO = 0.7

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
      if (review) return !review.mastered && review.nextReview <= today
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

  const due = state.chunkReviews
    .filter((review) => !review.mastered && review.nextReview <= today)
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

function selectGapItems(
  state: AppState,
  count: number,
  random: () => number,
): GapItem[] {
  const today = toLocalDateString()
  const dueGaps = state.wordGaps
    .filter((gap) => gap.status === 'learning' && gap.nextReview <= today)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))

  const genericWords = selectUniqueItems(
    contentRepository.paraphraseWords,
    count,
    state.recentWordIds,
    random,
  )

  const personalTarget = Math.min(dueGaps.length, Math.round(count * PERSONAL_GAP_RATIO))
  const personal = dueGaps.slice(0, personalTarget)
  const items: GapItem[] = personal.map((gap) => ({
    key: `gap-${gap.id}`,
    kind: 'retrieve',
    target: gap.target,
    context: gap.context,
    isPersonal: true,
    sourceId: gap.id,
  }))

  for (const word of genericWords.slice(0, count - personal.length)) {
    items.push({
      key: `word-${word.id}`,
      kind: 'paraphrase',
      target: word.word,
      context: '',
      isPersonal: false,
      sourceId: word.id,
    })
  }
  return items
}

function selectFocusWords(state: AppState, random: () => number): string[] {
  const today = toLocalDateString()
  const reusable = state.wordGaps.filter(
    (gap) =>
      gap.successCount > 0 &&
      (gap.status === 'mastered' || gap.nextReview > today),
  )
  return shuffle(reusable, random)
    .slice(0, 2)
    .map((gap) => gap.target)
}


function selectDiverseQuestions(
  state: AppState,
  count: number,
  random: () => number,
) {
  const ordered = selectUniqueItems(
    contentRepository.questions,
    contentRepository.questions.length,
    state.recentQuestionIds,
    random,
  )
  const chosen = []
  const usedCategories = new Set<string>()

  for (const question of ordered) {
    if (chosen.length >= count) break
    if (usedCategories.has(question.category)) continue
    chosen.push(question)
    usedCategories.add(question.category)
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

function selectFluencyReminders(state: AppState, random: () => number) {
  const today = toLocalDateString()
  return shuffle(
    state.fluencyNotes.filter((note) => note.nextReview <= today),
    random,
  )
    .slice(0, 2)
    .map((note) => ({ id: note.id, kind: note.kind, text: note.text }))
}

export function buildSessionPlan(
  state: AppState,
  random: () => number = Math.random,
): SessionPlan {
  const topics = selectUniqueItems(contentRepository.topics, 1, state.recentTopicIds, random)
  if (topics.length === 0) throw new Error('Aucun sujet de conversation disponible.')
  const topic: Topic = topics[0]

  const questionPool = selectDiverseQuestions(
    state,
    QUESTIONS_PER_SESSION + 1,
    random,
  )
  const questions = questionPool.slice(0, QUESTIONS_PER_SESSION)
  const pivotQuestion = questionPool[QUESTIONS_PER_SESSION] ?? null
  const chunks = selectChunks(state, CHUNKS_PER_SESSION, random)
  const chunksOfDay = shuffle(chunks, random).slice(0, 2)

  return {
    topic,
    chunks,
    chunksOfDay,
    questions,
    pivotQuestion,
    gapItems: selectGapItems(state, GAPS_PER_SESSION, random),
    focusWords: selectFocusWords(state, random),
    fluencyReminders: selectFluencyReminders(state, random),
  }
}

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

/** Select chunks by review priority: due → unseen → everything else. */
function selectChunks(
  state: AppState,
  count: number,
  random: () => number,
): Chunk[] {
  const today = toLocalDateString()
  const all = [...contentRepository.chunks]
  const byId = new Map(all.map((chunk) => [chunk.id, chunk]))

  const due = state.chunkReviews
    .filter((review) => !review.mastered && review.nextReview <= today)
    .map((review) => byId.get(review.chunkId))
    .filter((chunk): chunk is Chunk => Boolean(chunk))

  const unseen = all.filter(
    (chunk) =>
      !state.recentChunkIds.includes(chunk.id) &&
      !state.chunkReviews.some((review) => review.chunkId === chunk.id),
  )

  const rest = all.filter((chunk) => !unseen.includes(chunk))

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

  const personalTarget = Math.min(
    dueGaps.length,
    Math.round(count * PERSONAL_GAP_RATIO),
  )
  const personal = dueGaps.slice(0, personalTarget)
  const genericCount = count - personal.length

  const items: GapItem[] = personal.map((gap) => ({
    key: `gap-${gap.id}`,
    kind: 'retrieve',
    target: gap.target,
    context: gap.context,
    isPersonal: true,
    sourceId: gap.id,
  }))

  for (const word of genericWords.slice(0, genericCount)) {
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

export function buildSessionPlan(
  state: AppState,
  random: () => number = Math.random,
): SessionPlan {
  const topics = selectUniqueItems(contentRepository.topics, 1, state.recentTopicIds, random)
  if (topics.length === 0) {
    throw new Error('Aucun sujet de conversation disponible.')
  }
  const topic: Topic = topics[0]

  const questions = selectUniqueItems(
    contentRepository.questions,
    QUESTIONS_PER_SESSION,
    state.recentQuestionIds,
    random,
  )

  const chunks = selectChunks(state, CHUNKS_PER_SESSION, random)
  // The first chunks worked become the "chunks of the day" to reuse later.
  const chunksOfDay = shuffle(chunks, random).slice(0, 2)

  const gapItems = selectGapItems(state, GAPS_PER_SESSION, random)

  return { topic, chunks, chunksOfDay, questions, gapItems }
}

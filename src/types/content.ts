export type Difficulty = 'easy' | 'medium' | 'hard'

export type QuestionType =
  | 'personal'
  | 'opinion'
  | 'argumentation'
  | 'narrative'
  | 'hypothetical'
  | 'comparison'
  | 'problem-solving'
  | 'abstract'

export type Register = 'familier' | 'courant' | 'soutenu'

export interface Topic {
  id: string
  title: string
  category: string
  difficulty: Difficulty
  /** Prompts are only "pistes", never full answers. */
  prompts: string[]
  transferPrompt: string
}

export interface Question {
  id: string
  text: string
  category: string
  difficulty: Difficulty
  type?: QuestionType
  /** IDs of questions from other categories that work as abrupt advanced pivots. */
  pivots?: string[]
}

export interface ParaphraseWord {
  id: string
  word: string
  category: string
  difficulty: Difficulty
  /** Angles that help describe the concept without revealing the target word. */
  rescueAngles?: string[]
}

/** A reusable spoken-French "chunk" (expression) to retrieve and reuse. */
export interface Chunk {
  id: string
  /** What the speaker wants to express (shown instead of the expression). */
  intent: string
  expression: string
  category: string
  level: string
  register?: Register
  usageTip?: string
}

export interface ConversationScenario {
  id: string
  situation: string
  goal: string
  category: string
  difficulty: Difficulty
  events: string[]
}

/** Short story for the retelling variant of the 4 → 3 → 2. */
export interface RetellingStory {
  id: string
  title: string
  category: string
  /** What is said; read aloud by the synthetic voice when there is no `audio`. */
  text: string
  transferPrompt: string
  /** A real speaker telling it (path under public/), from the prosody bank. */
  audio?: string
  /** Credit and license of the recording. */
  attribution?: string
  sourceUrl?: string
}

export interface ContentRepository {
  topics: readonly Topic[]
  questions: readonly Question[]
  paraphraseWords: readonly ParaphraseWord[]
  chunks: readonly Chunk[]
  conversationScenarios: readonly ConversationScenario[]
  retellingStories: readonly RetellingStory[]
}

export interface Identifiable {
  id: string
}

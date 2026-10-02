export type Difficulty = 'easy' | 'medium' | 'hard'

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
}

export interface ParaphraseWord {
  id: string
  word: string
  category: string
  difficulty: Difficulty
}

/** A reusable spoken-French "chunk" (expression) to retrieve and reuse. */
export interface Chunk {
  id: string
  /** What the speaker wants to express (shown instead of the expression). */
  intent: string
  expression: string
  category: string
  level: string
}

export interface ContentRepository {
  topics: readonly Topic[]
  questions: readonly Question[]
  paraphraseWords: readonly ParaphraseWord[]
  chunks: readonly Chunk[]
}

export interface Identifiable {
  id: string
}

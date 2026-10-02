export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Topic {
  id: string
  title: string
  category: string
  difficulty: Difficulty
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

export interface NativeExpression {
  id: string
  expression: string
  category: string
}

export interface ContentRepository {
  topics: readonly Topic[]
  questions: readonly Question[]
  paraphraseWords: readonly ParaphraseWord[]
  nativeExpressions: readonly NativeExpression[]
}

export interface RecentContent {
  topicIds: readonly string[]
  questionIds: readonly string[]
  wordIds: readonly string[]
  expressionIds: readonly string[]
}

export interface SessionContent {
  topic: Topic
  paraphraseWords: ParaphraseWord[]
  questions: Question[]
  expressions: NativeExpression[]
}

export interface Identifiable {
  id: string
}

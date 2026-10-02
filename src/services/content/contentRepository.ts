import topicsData from '../../data/topics.json'
import questionsData from '../../data/questions.json'
import paraphraseWordsData from '../../data/paraphrase-words.json'
import chunksData from '../../data/native-expressions.json'
import conversationScenariosData from '../../data/conversation-scenarios.json'
import retellingStoriesData from '../../data/retelling-stories.json'
import type {
  Chunk,
  ConversationScenario,
  ContentRepository,
  ParaphraseWord,
  Question,
  RetellingStory,
  Topic,
} from '../../types/content'

// JSON is imported statically so the content ships with the bundle and works on
// a static host without any backend. New content only requires editing the JSON.
export const contentRepository: ContentRepository = {
  topics: topicsData as unknown as Topic[],
  questions: questionsData as unknown as Question[],
  paraphraseWords: paraphraseWordsData as unknown as ParaphraseWord[],
  chunks: chunksData as unknown as Chunk[],
  conversationScenarios: conversationScenariosData as unknown as ConversationScenario[],
  retellingStories: retellingStoriesData as unknown as RetellingStory[],
}

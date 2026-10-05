import topicsData from '../../data/topics.json'
import questionsData from '../../data/questions.json'
import paraphraseWordsData from '../../data/paraphrase-words.json'
import chunksData from '../../data/native-expressions.json'
import conversationScenariosData from '../../data/conversation-scenarios.json'
import retellingStoriesData from '../../data/retelling-stories.json'
import retellingRecordingsData from '../../data/retelling-recordings.json'
import prosodyData from '../../data/prosody.json'
import type {
  Chunk,
  ConversationScenario,
  ContentRepository,
  ParaphraseWord,
  Question,
  RetellingStory,
  Topic,
} from '../../types/content'

interface RetellingRecording {
  prosodyId: string
  title: string
  category: string
  transferPrompt: string
}

/**
 * "Écoute une courte histoire ou un extrait naturel": some retelling stories
 * are real speakers from the prosody bank instead of the synthetic voice.
 */
export function storiesFromRecordings(
  recordings: readonly RetellingRecording[],
  bank: readonly { id: string; audio?: string; transcript: string; attribution?: string; sourceUrl?: string }[],
): RetellingStory[] {
  const byId = new Map(bank.map((entry) => [entry.id, entry]))
  return recordings.flatMap((recording) => {
    const entry = byId.get(recording.prosodyId)
    if (!entry?.audio) return []
    return [
      {
        id: `story_${recording.prosodyId}`,
        title: recording.title,
        category: recording.category,
        text: entry.transcript,
        transferPrompt: recording.transferPrompt,
        audio: entry.audio,
        attribution: entry.attribution,
        sourceUrl: entry.sourceUrl,
      },
    ]
  })
}

// JSON is imported statically so the content ships with the bundle and works on
// a static host without any backend. New content only requires editing the JSON.
export const contentRepository: ContentRepository = {
  topics: topicsData as unknown as Topic[],
  questions: questionsData as unknown as Question[],
  paraphraseWords: paraphraseWordsData as unknown as ParaphraseWord[],
  chunks: chunksData as unknown as Chunk[],
  conversationScenarios: conversationScenariosData as unknown as ConversationScenario[],
  retellingStories: [
    ...(retellingStoriesData as unknown as RetellingStory[]),
    ...storiesFromRecordings(retellingRecordingsData, prosodyData),
  ],
}

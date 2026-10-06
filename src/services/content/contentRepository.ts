import topicsData from '../../data/topics.json'
import questionsData from '../../data/questions.json'
import paraphraseWordsData from '../../data/paraphrase-words.json'
import chunksData from '../../data/native-expressions.json'
import conversationScenariosData from '../../data/conversation-scenarios.json'
import retellingStoriesData from '../../data/retelling-stories.json'
import retellingRecordingsData from '../../data/retelling-recordings.json'
import prosodyData from '../../data/prosody.json'
import tabooTopicsData from '../../data/taboo-topics.json'
import chunkClipsData from '../../data/chunk-clips.json'
import type {
  Chunk,
  ConversationScenario,
  ContentRepository,
  NativeClip,
  ParaphraseWord,
  TabooTopic,
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

/**
 * Attaches to each chunk the moment a real speaker of the prosody bank says it
 * (found by `scripts/find-chunk-clips.mjs`), to hear its spoken form.
 */
export function withNativeClips(
  chunks: readonly Chunk[],
  clips: Readonly<Record<string, NativeClip>>,
): Chunk[] {
  return chunks.map((chunk) => (clips[chunk.id] ? { ...chunk, nativeClip: clips[chunk.id] } : chunk))
}

// JSON is imported statically so the content ships with the bundle and works on
// a static host without any backend. New content only requires editing the JSON.
export const contentRepository: ContentRepository = {
  topics: topicsData as unknown as Topic[],
  questions: questionsData as unknown as Question[],
  paraphraseWords: paraphraseWordsData as unknown as ParaphraseWord[],
  chunks: withNativeClips(
    chunksData as unknown as Chunk[],
    chunkClipsData as unknown as Record<string, NativeClip>,
  ),
  conversationScenarios: conversationScenariosData as unknown as ConversationScenario[],
  retellingStories: [
    ...(retellingStoriesData as unknown as RetellingStory[]),
    ...storiesFromRecordings(retellingRecordingsData, prosodyData),
  ],
  tabooTopics: tabooTopicsData as unknown as TabooTopic[],
}

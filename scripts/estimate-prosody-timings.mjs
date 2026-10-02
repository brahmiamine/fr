// Re-times every synthetic (TTS) prosody model from its syllable count.
//
// Browser speech synthesis exposes no word timestamps, so group start/end
// values are *estimated* (syllables ÷ speaking rate + short pauses). The
// imitation segment is the first sentence, extended until it lasts 5–15 s.
//
//   node scripts/estimate-prosody-timings.mjs
//
// Recorded models (`modelKind: "recording"`) are left untouched: their
// timestamps must be measured on the real audio file.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  chooseImitationSegment,
  estimateGroupTimings,
} from '../src/services/content/prosodyTiming.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'src', 'data', 'prosody.json')
const exercises = JSON.parse(readFileSync(file, 'utf8'))

for (const exercise of exercises) {
  if ((exercise.modelKind ?? 'recording') !== 'tts') continue
  exercise.groups = estimateGroupTimings(exercise.groups, exercise.speed ?? 'normal')
  exercise.imitation = chooseImitationSegment(exercise.groups)
  exercise.timing = 'estimated'
}

writeFileSync(file, `${JSON.stringify(exercises, null, 2)}\n`)
console.log(`${exercises.length} extraits re-chronométrés.`)

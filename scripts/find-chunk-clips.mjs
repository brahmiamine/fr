#!/usr/bin/env node
/**
 * Finds, for each chunk of src/data/native-expressions.json, a moment where a
 * real speaker of the prosody bank says it, using the measured word timings of
 * src/data/prosody.json. Writes src/data/chunk-clips.json:
 *
 *   { "<chunkId>": { "exerciseId": "prosody_yt_012", "start": 3.1, "end": 4.6 } }
 *
 * Only exact word sequences count (accents, case and punctuation ignored), so
 * the clip really says the chunk — in its spoken form, with the speaker's
 * melody. Run again after adding chunks or recordings:
 *
 *   node scripts/find-chunk-clips.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const chunks = JSON.parse(readFileSync('src/data/native-expressions.json', 'utf8'))
const bank = JSON.parse(readFileSync('src/data/prosody.json', 'utf8'))

/** Lower case, no accents, apostrophes split, punctuation dropped. */
export function tokens(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "' ")
    .replace(/[^a-z0-9' -]+/g, ' ')
    .split(/\s+/)
    .flatMap((word) => word.split('-'))
    .filter(Boolean)
}

/** Every word of the bank with its timing, one list per excerpt. */
function timedWords(exercise) {
  const words = []
  for (const group of exercise.groups) {
    if (!group.words) return []
    const raw = group.text.split(/\s+/).filter(Boolean)
    raw.forEach((word, index) => {
      const [start, end] = group.words[index] ?? []
      if (start === undefined) return
      for (const token of tokens(word)) words.push({ token, start, end })
    })
  }
  return words
}

const excerpts = bank
  .filter((exercise) => exercise.modelKind === 'recording' && exercise.annotation === 'acoustic' && exercise.audio)
  .map((exercise) => ({ id: exercise.id, words: timedWords(exercise) }))

const MIN_TOKENS = 2
const PAD = 0.12
const clips = {}

for (const chunk of chunks) {
  const target = tokens(chunk.expression.replace(/…/g, ' '))
  if (target.length < MIN_TOKENS) continue
  let best = null
  for (const excerpt of excerpts) {
    const { words } = excerpt
    for (let i = 0; i + target.length <= words.length; i += 1) {
      if (target.every((token, offset) => words[i + offset].token === token)) {
        const start = Math.max(0, words[i].start - PAD)
        const end = words[i + target.length - 1].end + PAD
        // Prefer a clip that is neither too short nor too long.
        const length = end - start
        if (length < 0.4 || length > 6) continue
        if (!best || Math.abs(length - 1.5) < Math.abs(best.end - best.start - 1.5)) {
          best = { exerciseId: excerpt.id, start: round(start), end: round(end) }
        }
      }
    }
  }
  if (best) clips[chunk.id] = best
}

function round(value) {
  return Math.round(value * 100) / 100
}

writeFileSync('src/data/chunk-clips.json', `${JSON.stringify(clips, null, 2)}\n`)
console.log(`${Object.keys(clips).length} chunks found in real recordings (of ${chunks.length}).`)

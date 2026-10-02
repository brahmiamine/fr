// Generates silent WAV placeholders for the prosody exercises so the audio
// player and segmented playback work end-to-end before real recordings are
// dropped in. Replace the generated .wav files with real recordings (any
// format the browser supports) keeping the same filenames.
//
//   node scripts/generate-prosody-audio.mjs
//
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'audio', 'prosody')

const SAMPLE_RATE = 22050

function wavSilent(seconds) {
  const samples = Math.ceil(seconds * SAMPLE_RATE)
  const dataSize = samples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  buffer.writeUInt16LE(2, 32) // block align
  buffer.writeUInt16LE(16, 34) // bits per sample
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  // Remaining bytes are already zero -> silence.

  return buffer
}

const data = JSON.parse(
  readFileSync(join(root, 'src', 'data', 'prosody.json'), 'utf8'),
)

mkdirSync(outDir, { recursive: true })

for (const exercise of data) {
  const maxEnd = exercise.groups.reduce(
    (max, group) => Math.max(max, group.end),
    0,
  )
  const duration = Math.ceil(maxEnd) + 0.3
  const file = join(outDir, `${exercise.id}.wav`)
  writeFileSync(file, wavSilent(duration))
  console.log(`wrote ${exercise.id}.wav (${duration.toFixed(1)}s, ${exercise.audio})`)
}

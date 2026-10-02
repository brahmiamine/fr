// Pure helpers for `scripts/prosody-from-youtube.mjs`: transcript parsing,
// rhythm-group building, excerpt selection and entry validation.
//
// No filesystem or process access here, so the whole pipeline logic stays
// testable and the CLI stays thin.

/** Path shape enforced by `src/data/content-quality.test.ts` for recordings. */
export const AUDIO_PATH_PATTERN = /^audio\/prosody\/[^/]+\.ogg$/

/** Licenses the app accepts, and therefore the only ones we may emit. `CC-BY-3.0`
 * is YouTube's own Creative Commons designation, still shareable with credit. */
export const ALLOWED_LICENSES = ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0']

/**
 * YouTube labels its Creative Commons videos in the video metadata. Mapping the
 * declared label is reading a licence, not guessing one — an unrecognised or
 * absent label simply stays empty, and the review step has to fill it in.
 */
const YOUTUBE_LICENSES = {
  creativecommonsattributionlicensereuseallowed: 'CC-BY-3.0',
  creativecommonsattributionsharealikelicensereuseallowed: 'CC-BY-SA-3.0',
  creativecommonscc0publicdomaindedication: 'CC0-1.0',
}

function normalizeLicenseLabel(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Accepts the value of `license` from `yt-dlp --dump-json`, a string or a list. */
export function licenseFromYouTube(labels) {
  const provided = Array.isArray(labels) ? labels : [labels]
  for (const label of provided) {
    if (!label) continue
    const mapped = YOUTUBE_LICENSES[normalizeLicenseLabel(label)]
    if (mapped) return mapped
  }
  return ''
}

/** Attribution a CC licence requires: author, title, source, licence, changes. */
export function attributionForYouTube(video, license) {
  return [
    video.uploader,
    video.title && `« ${video.title} »`,
    'via YouTube.',
    `Licence ${license}.`,
    'Extrait découpé et réencodé en OGG mono.',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Mirror of the limits in `src/features/prosody/types.ts` and
 * `src/services/content/prosodyRepository.ts`. Keep both sides in sync: the
 * build step refuses to write an entry the app would reject at runtime.
 */
export const LIMITS = {
  minFullSeconds: 10,
  maxFullSeconds: 30,
  minImitationSeconds: 5,
  maxImitationSeconds: 15,
}

/** Extra audio kept after the excerpt so the last consonant is never clipped. */
export const TAIL_PAD_SECONDS = 0.25

/** Retelling prompt used when no per-video or per-excerpt idea is provided. */
export const DEFAULT_RETELLING = 'Raconter ce passage avec tes propres mots.'

/** A pause longer than this closes the current sentence. */
const SENTENCE_GAP_SECONDS = 0.7

/** A pause longer than this closes the current rhythm group. */
const GROUP_GAP_SECONDS = 0.18

/**
 * Automatic transcripts carry no punctuation to break on, so a fast speaker can
 * run for tens of seconds without a pause wide enough to split on. A group that
 * long is useless as a rhythm model, hence a ceiling: a sense group is a short
 * breath unit, not a paragraph.
 */
const MAX_GROUP_SECONDS = 4

/**
 * ASR transcripts (YouTube auto-captions, WhisperX) carry no punctuation at
 * all, so there is nothing to split on. Segments are then cut at the widest
 * pause found once they reach `SOFT`, and never allowed past `HARD`.
 */
const ASR_SOFT_SECONDS = 8
const ASR_HARD_SECONDS = 13
const ASR_PAUSE_SECONDS = 0.3

/** A repeated word this soon after the previous one is a rolling-caption artefact. */
const ROLLING_REPEAT_SECONDS = 0.5

const ABBREVIATIONS = new Set(['m', 'mm', 'mme', 'mlle', 'dr', 'pr', 'etc', 'ex', 'av'])

const WH_QUESTION_OPENERS = [
  'comment',
  'combien',
  'pourquoi',
  'quand',
  'où',
  'ou',
  'qui',
  'que',
  'quoi',
  'quel',
  'quelle',
  'quels',
  'quelles',
  "qu'est-ce",
  "qu'est",
]

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

// ---------------------------------------------------------------------------
// Time parsing and formatting
// ---------------------------------------------------------------------------

/** Accepts `HH:MM:SS.mmm`, `HH:MM:SS,mmm` and `MM:SS.mmm`. */
export function parseTimestamp(value) {
  const parts = String(value).trim().replace(',', '.').split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

export function formatTimestamp(seconds) {
  const safe = Math.max(0, seconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = (safe % 60).toFixed(1).padStart(4, '0')
  const stamp = `${String(minutes).padStart(2, '0')}:${rest}`
  return hours > 0 ? `${hours}:${stamp}` : stamp
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

// ---------------------------------------------------------------------------
// Subtitle parsing
// ---------------------------------------------------------------------------

function decodeEntities(value) {
  return value.replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
}

function parseCueBlocks(text) {
  const cuePattern = /^\s*(\S[^\n]*?)\s*-->\s*(\S[^\n]*?)\s*$/gm
  const cues = []
  let match
  while ((match = cuePattern.exec(text)) !== null) {
    const start = parseTimestamp(match[1].split(/\s+/)[0])
    const end = parseTimestamp(match[2].split(/\s+/)[0])
    if (start === null || end === null) continue
    cues.push({ start, end, headerStart: match.index, bodyStart: cuePattern.lastIndex })
  }
  // A cue body runs from the line after its timestamp to the next timestamp.
  for (let index = 0; index < cues.length; index += 1) {
    const stop = index + 1 < cues.length ? cues[index + 1].headerStart : text.length
    cues[index].body = text.slice(cues[index].bodyStart, stop)
  }
  return cues
}

/**
 * YouTube rolling captions repeat the previous line in the next cue. Keeping
 * only each cue's last non-empty line yields one monotonically increasing
 * segment list, which is what the excerpt selector needs.
 */
function vttToSegments(text) {
  const segments = []
  for (const cue of parseCueBlocks(text)) {
    const lines = cue.body
      .split('\n')
      .map(stripTags)
      .filter((line) => line.length > 0)
    const newest = lines.at(-1)
    if (!newest || newest === segments.at(-1)?.text) continue
    segments.push({ start: cue.start, end: cue.end, text: newest })
  }
  return segments
}

/**
 * YouTube's `json3` format carries a per-word offset, which the VTT export
 * throws away. This is the cheapest source of word level timings: no extra
 * tool, no model download.
 */
function json3ToWords(text) {
  const payload = JSON.parse(text)
  const words = []
  for (const event of payload.events ?? []) {
    const base = Number(event.tStartMs) / 1000
    if (!Number.isFinite(base)) continue
    let offset = 0
    for (const segment of event.segs ?? []) {
      if (typeof segment.tOffsetMs === 'number') offset = segment.tOffsetMs / 1000
      const word = stripTags(segment.utf8 ?? '')
      if (word.length === 0) continue
      words.push({ start: round(base + offset), end: round(base + offset), text: word })
    }
  }
  return words
}

function whisperxToWords(text) {
  const payload = JSON.parse(text)
  const words = []
  for (const segment of payload.segments ?? []) {
    for (const word of segment.words ?? []) {
      const value = stripTags(word.word ?? '')
      if (value.length === 0) continue
      words.push({ start: round(Number(word.start) || 0), end: round(Number(word.end) || 0), text: value })
    }
  }
  return words
}

/**
 * Gives every word a usable `[start, end)`: providers occasionally leave `end`
 * unset, and the app rejects overlapping groups.
 *
 * Rolling captions repeat the last word of one window as the first word of the
 * next, so an immediate repeat that lands within `ROLLING_REPEAT_SECONDS` is
 * dropped rather than transcribed twice.
 */
export function normalizeWords(words) {
  const ordered = [...words]
    .filter((word) => word.text.length > 0)
    .sort((a, b) => a.start - b.start)

  const deduped = ordered.filter((word, index) => {
    const previous = ordered[index - 1]
    if (!previous || previous.text !== word.text) return true
    return word.start - previous.start >= ROLLING_REPEAT_SECONDS
  })

  for (let index = 0; index < deduped.length; index += 1) {
    const word = deduped[index]
    const next = deduped[index + 1]
    if (!(word.end > word.start)) {
      word.end = Math.max(word.start + 0.05, next ? Math.min(next.start, word.start + 0.5) : word.start + 0.3)
    }
    if (next && word.end > next.start) word.end = next.start
    if (word.end <= word.start) word.end = word.start + 0.05
  }
  return deduped
}

/** Detects the transcript flavour from what `yt-dlp` actually downloaded. */
export function parseTranscript(text, format) {
  if (format === 'json3') return normalizeWords(json3ToWords(text))
  if (format === 'whisperx') return normalizeWords(whisperxToWords(text))
  return normalizeWords(segmentsToWords(vttToSegments(text)))
}

/** Spreads a VTT segment's timestamp across its words, proportionally to length. */
function segmentsToWords(segments) {
  const words = []
  for (const segment of segments) {
    const tokens = segment.text.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue
    const span = Math.max(segment.end - segment.start, 0.05)
    const totalChars = tokens.reduce((sum, token) => sum + token.length, 0)
    let cursor = segment.start
    for (const token of tokens) {
      const duration = (token.length / totalChars) * span
      words.push({ start: round(cursor), end: round(cursor + duration), text: token })
      cursor += duration
    }
  }
  return words
}

// ---------------------------------------------------------------------------
// Sentence and rhythm-group building
// ---------------------------------------------------------------------------

function endsSentence(word) {
  const cleaned = word.replace(/[»")]+$/, '')
  if (ABBREVIATIONS.has(cleaned.replace(/\.$/, '').toLowerCase())) return false
  return /[.!?…:]$/.test(cleaned)
}

/** Auto-captions and WhisperX output are punctuation-free, which changes how
 * segments must be cut. Detecting it is cheaper than trusting the format name:
 * a `vtt` file can perfectly well come from auto-captions. */
export function hasPunctuation(words) {
  const punctuated = words.filter((word) => /[.!?…]$/.test(word.text)).length
  return punctuated / Math.max(words.length, 1) >= 0.02
}

function joinWords(slice) {
  return slice
    .map((word) => word.text)
    .join(' ')
    .replace(/\s+([,;:!?.…»])/g, '$1')
}

function makeSegment(words, start, end) {
  const slice = words.slice(start, end)
  return {
    start: slice[0].start,
    end: slice.at(-1).end,
    text: joinWords(slice),
    words: slice,
  }
}

/**
 * Punctuated text: a segment ends on real sentence punctuation, or on a long
 * silence. `HARD` still applies so a runaway "sentence" cannot exceed the
 * excerpt budget.
 */
function segmentByPunctuation(words, limits) {
  const segments = []
  let start = 0

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const next = words[index + 1]
    const span = word.end - words[start].start
    const gap = next ? next.start - word.end : Number.POSITIVE_INFINITY

    const closed =
      (endsSentence(word.text) && span >= 0.4) ||
      gap > SENTENCE_GAP_SECONDS ||
      span >= limits.hard
    if (closed) {
      segments.push(makeSegment(words, start, index + 1))
      start = index + 1
    }
  }

  if (start < words.length) segments.push(makeSegment(words, start, words.length))
  return segments
}

/**
 * Punctuation-free text: accumulate words until `soft` seconds, then keep
 * going while looking for the widest pause to cut on. Cutting on the largest
 * nearby pause keeps segments on natural breathing points instead of slicing
 * mid-clause at an arbitrary word count.
 */
function segmentByPause(words, limits) {
  const segments = []
  let start = 0

  while (start < words.length) {
    let end = start
    let cut = -1
    let widest = -1

    while (end < words.length) {
      const span = words[end].end - words[start].start
      if (span > limits.hard && end > start) break
      end += 1

      const next = words[end]
      if (!next) {
        cut = end
        break
      }

      const gap = next.start - words[end - 1].end
      if (gap >= ASR_PAUSE_SECONDS && span >= limits.soft && gap > widest) {
        widest = gap
        cut = end
      }
    }

    // No pause worth cutting on: fall back to where the hard limit stopped us.
    if (cut <= start) cut = end
    segments.push(makeSegment(words, start, cut))
    start = cut
  }

  return segments
}

/**
 * Splits a word stream into the segments the excerpt selector consumes. A
 * segment is a real sentence when the transcript is punctuated, and a
 * pause-bounded chunk otherwise.
 */
export function segmentWords(words, limits = LIMITS) {
  if (words.length === 0) return []
  const bounds = { soft: ASR_SOFT_SECONDS, hard: ASR_HARD_SECONDS, ...limits }
  const segments = hasPunctuation(words)
    ? segmentByPunctuation(words, bounds)
    : segmentByPause(words, bounds)
  return segments.filter((segment) => segment.end > segment.start)
}

function isWhQuestion(text) {
  const lower = text.toLowerCase()
  return WH_QUESTION_OPENERS.some((opener) => lower.startsWith(`${opener} `) || lower.startsWith(`${opener}'`))
}

/**
 * Intonation is an acoustic property, so this is only a plausible default:
 * a comma keeps the voice up, a sentence ends low, a yes/no question rises.
 * The review step is where a human corrects it.
 */
export function defaultIntonation(text, isSentenceEnd) {
  const trimmed = text.trim()
  if (/\?$/.test(trimmed)) return isWhQuestion(trimmed) ? 'fall' : 'rise'
  if (/[,;:]$/.test(trimmed)) return 'rise'
  if (isSentenceEnd) return 'fall'
  return 'level'
}

/**
 * Turns words into the rhythmic groups the app displays: a break at commas and
 * at short pauses, which is what a fluent speaker actually breathes on.
 */
export function splitIntoRhythmGroups(words) {
  const groups = []
  let buffer = []

  const flush = (isSentenceEnd) => {
    if (buffer.length === 0) return
    const text = buffer.map((word) => word.text).join(' ').replace(/\s+([,;:!?.…»])/g, '$1')
    groups.push({
      text,
      start: round(buffer[0].start),
      end: round(buffer.at(-1).end),
      intonation: defaultIntonation(text, isSentenceEnd),
    })
    buffer = []
  }

  for (const word of words) {
    if (buffer.length > 0) {
      const gap = word.start - buffer.at(-1).end
      const span = word.end - buffer[0].start
      if (gap > GROUP_GAP_SECONDS || span > MAX_GROUP_SECONDS) flush(false)
    }
    buffer.push(word)
    if (/[,;:]$/.test(word.text)) flush(false)
    else if (endsSentence(word.text)) flush(true)
  }
  flush(true)

  return groups.filter((group) => group.end > group.start)
}

// ---------------------------------------------------------------------------
// Excerpt selection
// ---------------------------------------------------------------------------

/**
 * Groups consecutive sentences into excerpts respecting the 10–30 s window.
 * Excerpts never overlap, always start and end on a sentence boundary, and
 * never bridge a long silence.
 */
export function selectCandidates(sentences, limits = LIMITS, minWords = 12) {
  const candidates = []
  const seen = new Set()
  let index = 0

  while (index < sentences.length) {
    const first = sentences[index]
    if (first.end - first.start > limits.maxFullSeconds) {
      index += 1
      continue
    }

    let last = index
    while (last + 1 < sentences.length) {
      const next = sentences[last + 1]
      if (next.end - first.start > limits.maxFullSeconds) break
      if (next.start - sentences[last].end > SENTENCE_GAP_SECONDS) break
      last += 1
    }

    const duration = sentences[last].end - first.start
    const words = sentences.slice(index, last + 1).flatMap((sentence) => sentence.words)

    if (duration < limits.minFullSeconds || words.length < minWords) {
      index += 1
      continue
    }

    const text = sentences
      .slice(index, last + 1)
      .map((sentence) => sentence.text)
      .join(' ')
    const key = text.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({
        start: round(first.start),
        end: round(sentences[last].end),
        duration: round(duration, 2),
        text,
        wordCount: words.length,
        sentenceCount: last - index + 1,
      })
    }

    index = last + 1
  }

  return candidates
}

/**
 * The imitation window starts at the beginning of the excerpt, as in the
 * hand-made recordings: the learner imitates the opening, not an arbitrary
 * slice from the middle.
 */
export function pickImitationWindow(groups, limits = LIMITS) {
  const fromStart = []
  for (const group of groups) {
    if (group.end - groups[0].start > limits.maxImitationSeconds) break
    fromStart.push(group)
  }

  const prefix = fromStart.at(-1)
  if (prefix && prefix.end - groups[0].start >= limits.minImitationSeconds) {
    return { start: groups[0].start, end: prefix.end }
  }

  // No usable prefix: fall back to the longest window that still fits.
  let best = null
  for (let start = 0; start < groups.length; start += 1) {
    for (let end = start; end < groups.length; end += 1) {
      const duration = groups[end].end - groups[start].start
      if (duration > limits.maxImitationSeconds) break
      if (duration >= limits.minImitationSeconds && (!best || duration > best.end - best.start)) {
        best = { start: groups[start].start, end: groups[end].end }
      }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Entry building and validation
// ---------------------------------------------------------------------------

/** Builds a `ProsodyExercise` from a kept candidate. Caller supplies the id. */
export function buildProsodyEntry({ id, meta, candidate, words, personal = false }) {
  const excerpt = words.filter((word) => word.start >= candidate.start - 1e-6 && word.end <= candidate.end + 1e-6)
  const relative = excerpt.map((word) => ({
    start: round(word.start - candidate.start),
    end: round(word.end - candidate.start),
    text: word.text,
  }))
  const groups = splitIntoRhythmGroups(relative)
  const imitation = pickImitationWindow(groups)

  const entry = {
    id,
    level: meta.level,
    category: meta.category,
    modelKind: 'recording',
    audio: `audio/prosody/${id}.ogg`,
    transcript: candidate.text,
    groups,
    imitation: imitation ?? { start: groups[0]?.start ?? 0, end: groups[0]?.end ?? 0 },
    retelling: { idea: meta.retellingIdea || DEFAULT_RETELLING },
    ready: true,
    source: meta.source,
    sourceUrl: meta.sourceUrl,
    sourceRange: {
      start: round(candidate.start),
      end: round(candidate.end + TAIL_PAD_SECONDS),
    },
    voiceLocale: meta.voiceLocale ?? 'fr-FR',
    register: meta.register,
    speed: meta.speed,
    focus: meta.focus,
    timing: 'measured',
  }

  if (personal) {
    // No redistribution license exists for this recording, and claiming one
    // would be false. Saying so explicitly is more honest than leaving it out.
    entry.attribution = `Extrait conservé pour un usage personnel uniquement, non redistribué. Source : ${meta.source}.`
    return entry
  }

  entry.license = meta.license
  entry.attribution = meta.attribution
  return entry
}

/**
 * Mirror of `validateProsodyExercise` plus the recording rules from
 * `content-quality.test.ts`. Returns human-readable problems, empty when the
 * entry is shippable.
 *
 * `personal: true` drops the publication checks only: the entry still has to
 * be playable, but it is never committed, so demanding a redistribution
 * license would be meaningless.
 */
export function validateEntry(entry, limits = LIMITS, { personal = false } = {}) {
  const errors = []
  const groups = entry.groups ?? []

  if (groups.length === 0) return ['no-groups: aucun groupe rythmique']

  const duration = Math.max(...groups.map((group) => group.end))
  const imitationDuration = entry.imitation.end - entry.imitation.start

  if (entry.ready !== true) errors.push('ready: doit valoir true')
  if (entry.modelKind !== 'recording') errors.push('modelKind: doit valoir "recording"')
  if (!AUDIO_PATH_PATTERN.test(entry.audio ?? '')) errors.push('audio: attendu "audio/prosody/<id>.ogg"')
  if (entry.timing !== 'measured') errors.push('timing: doit valoir "measured"')
  if (!entry.transcript?.trim()) errors.push('transcript: vide')

  if (duration < limits.minFullSeconds || duration > limits.maxFullSeconds) {
    errors.push(`durée: ${duration.toFixed(1)}s hors de ${limits.minFullSeconds}–${limits.maxFullSeconds}s`)
  }
  if (imitationDuration < limits.minImitationSeconds || imitationDuration > limits.maxImitationSeconds) {
    errors.push(`imitation: ${imitationDuration.toFixed(1)}s hors de ${limits.minImitationSeconds}–${limits.maxImitationSeconds}s`)
  }
  if (entry.imitation.start < 0 || entry.imitation.end > duration) {
    errors.push('imitation: hors des bornes de l’extrait')
  }

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index]
    const previous = groups[index - 1]
    if (!(group.end > group.start) || group.start < 0) {
      errors.push(`groupes: bornes invalides au groupe ${index + 1}`)
    }
    if (previous && group.start < previous.end) {
      errors.push(`groupes: chevauchement au groupe ${index + 1}`)
    }
  }

  if (personal) return errors

  if (!/^https:\/\//.test(entry.sourceUrl ?? '')) errors.push('sourceUrl: doit être une URL https')
  if (!ALLOWED_LICENSES.includes(entry.license)) {
    errors.push(`license: attendue parmi ${ALLOWED_LICENSES.join(', ')}`)
  }
  if (!entry.attribution?.trim()) errors.push('attribution: vide')
  if (!entry.source?.trim()) errors.push('source: vide')
  if (!entry.retelling?.idea?.trim()) errors.push('retelling.idea: à remplir (étape humaine)')

  return errors
}

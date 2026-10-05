#!/usr/bin/env node
// Builds prosody exercises from a YouTube video: download subtitles + audio
// with yt-dlp, pick 10–30 s excerpts, cut them with ffmpeg and append ready
// entries to `src/data/prosody.json`.
//
//   node scripts/prosody-from-youtube.mjs fetch      --url <url> [--url <url>…]
//   node scripts/prosody-from-youtube.mjs candidates --url <url> [--url <url>…]
//   node scripts/prosody-from-youtube.mjs build      --url <url> [--url <url>…]
//
// `--url` is repeatable: the videos are processed in sequence and the entries
// accumulate in the same file.
//
// Everything is cached under `.cache/prosody/<videoId>/`, so re-running after
// editing your selection never re-downloads or re-transcribes anything.
//
// Licensing stays a human decision: the tool never guesses a license, and it
// refuses to write an entry whose `sourceUrl`, `license` and `attribution` are
// not filled in. Only republish audio you own or that is licensed for reuse.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALLOWED_LICENSES,
  LIMITS,
  TAIL_PAD_SECONDS,
  attributionForYouTube,
  buildProsodyEntry,
  formatTimestamp,
  hasPunctuation,
  licenseFromYouTube,
  parseTranscript,
  segmentWords,
  selectCandidates,
  validateEntry,
} from './lib/prosody-youtube.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROSODY_JSON = join(root, 'src', 'data', 'prosody.json')
// Git-ignored: excerpts kept for private practice, never part of the repository.
const PERSONAL_JSON = join(root, 'src', 'data', 'prosody.personal.json')
const AUDIO_DIR = join(root, 'public', 'audio', 'prosody')
const CACHE_ROOT = join(root, '.cache', 'prosody')

/** Generated audio is git-ignored by pattern, so the ids must share a prefix. */
const PERSONAL_PREFIX = 'prosody_perso'

const TOOLS = [
  { name: 'yt-dlp', install: 'brew install yt-dlp', required: true },
  { name: 'ffmpeg', install: 'brew install ffmpeg', required: true },
  { name: 'whisperx', install: 'pipx install whisperx', required: false },
]

const USAGE = `
Extraits de prosodie depuis YouTube.

  node scripts/prosody-from-youtube.mjs <commande> [options]

Commandes
  fetch        Télécharge les sous-titres et l'audio dans .cache/prosody/<videoId>/
  candidates   Analyse la transcription et écrit candidates.json à relire
  build        Découpe les extraits retenus et complète src/data/prosody.json

Options
  --url <url>            URL YouTube, répétable pour traiter plusieurs vidéos
                         (omise : reprend la dernière vidéo en cache)
  --lang <code>          Langue des sous-titres (défaut : fr)
  --transcript <source>  auto | json3 | vtt | whisperx (défaut : auto)
  --min <secondes>       Durée minimale d'un extrait (défaut : ${LIMITS.minFullSeconds})
  --max <secondes>       Durée maximale d'un extrait (défaut : ${LIMITS.maxFullSeconds})
  --prefix <id>          Préfixe des identifiants générés (défaut : prosody_yt)
  --retelling "<texte>"  Idée de restitution appliquée à tous les extraits de la
                         vidéo (surchargeable extrait par extrait)
  --personal             Usage privé : écrit dans src/data/prosody.personal.json
                         (git-ignoré) et n'exige aucune licence de rediffusion
  --dry-run              N'écrit ni audio ni JSON
  --force                Re-télécharge même si le cache existe
  -h, --help             Affiche cette aide

Sources de transcription, par ordre de rapidité
  json3     Sous-titres YouTube horodatés au mot. Gratuit, instantané, précis.
  vtt       Sous-titres bruts. Horodatage par réplique seulement, donc approximatif.
  whisperx  Transcription locale (medium + cpu). Lent, mais fiable quand YouTube
            n'a rien d'exploitable. Nécessite : pipx install whisperx
`.trim()

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

function info(message) {
  console.log(`\n${message}`)
}

function parseArgs(argv) {
  const args = argv.filter((arg) => arg.length > 0)
  const options = {
    command: 'help',
    urls: [],
    lang: 'fr',
    transcript: 'auto',
    min: LIMITS.minFullSeconds,
    max: LIMITS.maxFullSeconds,
    prefix: 'prosody_yt',
    retelling: '',
    personal: false,
    dryRun: false,
    force: false,
  }

  let index = 0
  if (args[0] && !args[0].startsWith('-')) {
    options.command = args[0]
    index = 1
  }

  for (; index < args.length; index += 1) {
    const flag = args[index]
    const value = args[index + 1]
    const takeValue = () => {
      if (value === undefined || value.startsWith('--')) fail(`${flag} attend une valeur`)
      index += 1
      return value
    }

    if (flag === '--url') options.urls.push(takeValue())
    else if (flag === '--lang') options.lang = takeValue()
    else if (flag === '--transcript') options.transcript = takeValue()
    else if (flag === '--prefix') options.prefix = takeValue()
    else if (flag === '--retelling') options.retelling = takeValue()
    else if (flag === '--min') options.min = Number(takeValue())
    else if (flag === '--max') options.max = Number(takeValue())
    else if (flag === '--dry-run') options.dryRun = true
    else if (flag === '--personal') options.personal = true
    else if (flag === '--force') options.force = true
    else if (flag === '-h' || flag === '--help') options.command = 'help'
    else fail(`Option inconnue : ${flag}`)
  }

  if (options.transcript !== 'auto') {
    const known = ['json3', 'vtt', 'whisperx']
    if (!known.includes(options.transcript)) fail(`--transcript attendu parmi ${known.join(', ')}`)
  }
  if (!(options.min > 0) || !(options.max > options.min)) fail('--min et --max doivent encadrer une durée valide')

  return options
}

function hasTool(name) {
  return spawnSync('which', [name], { stdio: 'ignore' }).status === 0
}

function checkTools(names) {
  const missing = TOOLS.filter((tool) => tool.required && names.includes(tool.name) && !hasTool(tool.name))
  if (missing.length === 0) return
  const lines = missing.map((tool) => `  ${tool.name.padEnd(10)} ${tool.install}`)
  fail(`Outils manquants :\n${lines.join('\n')}`)
}

function runTool(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) fail(`${command} : ${result.error.message}`)
  if (result.status !== 0) fail(`${command} a échoué (code ${result.status})`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function videoIdFromUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    fail(`URL invalide : ${rawUrl}`)
  }
  if (parsed.hostname.endsWith('youtu.be')) return parsed.pathname.slice(1)
  const direct = parsed.searchParams.get('v')
  if (direct) return direct
  const path = parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/]+)/)
  if (path) return path[1]
  return fail(`Impossible d'extraire l'identifiant vidéo de ${rawUrl}`)
}

/** Falls back to the most recent cache entry so `--url` stays optional. */
function resolveCacheDir(options, { mustExist }) {
  if (options.url) {
    const dir = join(CACHE_ROOT, videoIdFromUrl(options.url))
    if (mustExist && !existsSync(dir)) fail(`Rien en cache pour cette vidéo. Lance d'abord : fetch`)
    return dir
  }
  const entries = existsSync(CACHE_ROOT)
    ? readdirSync(CACHE_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : []
  if (entries.length !== 1) {
    fail(entries.length === 0 ? 'Aucune vidéo en cache. Lance d’abord : fetch --url <url>' : 'Plusieurs vidéos en cache : précise --url')
  }
  return join(CACHE_ROOT, entries[0].name)
}

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------

function fetchSource(options) {
  checkTools(['yt-dlp', 'ffmpeg'])
  const dir = resolveCacheDir(options, { mustExist: false })
  const target = join(dir, 'source')
  const hasAudio = existsSync(`${target}.wav`)

  if (options.force || !hasAudio) {
    mkdirSync(dir, { recursive: true })
    info(`Sous-titres ${options.lang}…`)
    runTool('yt-dlp', [
      '--skip-download',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      `${options.lang}.*,${options.lang}`,
      '--sub-format',
      'json3/vtt',
      '--write-info-json',
      '-o',
      `${target}.%(ext)s`,
      options.url,
    ])
    info('Audio…')
    runTool('yt-dlp', [
      '-x',
      '--audio-format',
      'wav',
      '--audio-quality',
      '0',
      '-o',
      `${target}.%(ext)s`,
      options.url,
    ])
  } else {
    info(`Cache déjà présent : ${dir}`)
  }

  return dir
}

// ---------------------------------------------------------------------------
// transcript resolution
// ---------------------------------------------------------------------------

/**
 * YouTube ships one file per requested language, so several may match:
 * `<lang>-orig` is the original auto-caption and the only one carrying word
 * level offsets, `<lang>` and `<lang>-xx` are plain translations without them.
 * The `-orig` file must win, hence an explicit priority instead of the
 * alphabetical order a bare directory scan would return.
 */
function findSubtitle(dir, lang, extension) {
  if (!existsSync(dir)) return null
  const entries = readdirSync(dir)
  const preferred = [`source.${lang}-orig${extension}`, `source.${lang}${extension}`]

  for (const name of preferred) {
    if (entries.includes(name)) return join(dir, name)
  }

  // Regional variants (`source.fr-fr.vtt`) and any other matching suffix.
  const match = entries
    .filter((entry) => entry.startsWith(`source.${lang}`) && entry.endsWith(extension))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))[0]
  return match ? join(dir, match) : null
}

/**
 * `json3` carries word level offsets and costs nothing; the VTT export drops
 * them, so it is only a coarse fallback. WhisperX is the last resort and the
 * only one that needs a Python install.
 */
function resolveTranscript(dir, options) {
  const candidates = [
    { format: 'json3', path: findSubtitle(dir, options.lang, '.json3') },
    { format: 'vtt', path: findSubtitle(dir, options.lang, '.vtt') },
    {
      format: 'whisperx',
      path: existsSync(join(dir, 'whisperx', 'source.json')) ? join(dir, 'whisperx', 'source.json') : null,
      requires: 'whisperx',
    },
  ]

  const wanted =
    options.transcript === 'auto' ? candidates : candidates.filter((item) => item.format === options.transcript)
  const available = wanted.find((item) => item.path)
  if (available) return available

  const asked = options.transcript === 'auto' ? 'aucune transcription' : `--transcript ${options.transcript}`
  const hints = [
    'Aucune transcription disponible.',
    asked,
    'Relance : fetch --url <url>',
    'Si YouTube ne fournit pas de sous-titres exploitables, installe whisperx puis relance avec --transcript whisperx.',
  ]
  return fail(hints.join('\n'))
}

function transcribeWithWhisperx(dir, sourcePath) {
  if (!hasTool('whisperx')) {
    fail('whisperx est requis mais introuvable.\n  pipx install whisperx')
  }
  info('Transcription WhisperX (medium, cpu)… cela peut prendre plusieurs minutes.')
  runTool('whisperx', [
    sourcePath,
    '--language',
    'fr',
    '--model',
    'medium',
    '--device',
    'cpu',
    '--compute_type',
    'int8',
    '--output_dir',
    join(dir, 'whisperx'),
    '--output_format',
    'json',
  ])
}

function loadWords(dir, options) {
  if (options.transcript === 'auto' && !findSubtitle(dir, options.lang, '.json3') && !findSubtitle(dir, options.lang, '.vtt')) {
    transcribeWithWhisperx(dir, join(dir, 'source.wav'))
  }
  if (options.transcript === 'whisperx' && !existsSync(join(dir, 'whisperx', 'source.json'))) {
    transcribeWithWhisperx(dir, join(dir, 'source.wav'))
  }

  const transcript = resolveTranscript(dir, options)
  const words = parseTranscript(readFileSync(transcript.path, 'utf8'), transcript.format)
  if (words.length === 0) fail(`Transcription vide (${transcript.path})`)

  const sentences = segmentWords(words)
  info(`Transcription « ${transcript.format} » : ${words.length} mots, ${sentences.length} segments`)

  if (!hasPunctuation(words)) {
    console.warn('⚠  Transcription sans ponctuation : segments découpés sur les pauses.')
  }
  if (transcript.format === 'vtt') {
    console.warn('⚠  Le format vtt n’horodate pas les mots : les groupes seront approximatifs.')
    console.warn('   Relance avec --transcript whisperx si un extrait mérite un timing exact.')
  }

  return { words, sentences }
}

// ---------------------------------------------------------------------------
// candidates
// ---------------------------------------------------------------------------

const DEFAULT_META = {
  level: 'B1',
  category: 'opinion',
  register: 'courant',
  speed: 'normal',
  focus: ['grouping', 'intonation'],
}

function readVideoInfo(dir) {
  const path = join(dir, 'source.info.json')
  if (!existsSync(path)) return {}
  const info = readJson(path)
  return {
    title: info.title ?? '',
    uploader: info.uploader ?? info.channel ?? '',
    webpageUrl: info.webpage_url ?? '',
    license: info.license ?? '',
    duration: info.duration ?? null,
  }
}

function buildCandidates(options) {
  const directory = resolveCacheDir(options, { mustExist: true })
  const { words, sentences } = loadWords(directory, options)
  const limits = { ...LIMITS, minFullSeconds: options.min, maxFullSeconds: options.max }
  const candidates = selectCandidates(sentences, limits, options.minWords ?? 12)

  if (candidates.length === 0) {
    fail('Aucun passage de 10–30 s respectant les critères.\nEssaie une autre vidéo ou assouplis --min / --max.')
  }

  const video = readVideoInfo(directory)
  // YouTube's own Creative Commons label is authoritative, so it prefills the
  // metadata instead of asking for a hand-written licence on every excerpt.
  const license = licenseFromYouTube(video.license)
  const review = {
    video: { id: directory.split('/').pop(), ...video },
    meta: {
      source: video.uploader,
      sourceUrl: video.webpageUrl,
      license,
      attribution: license ? attributionForYouTube(video, license) : '',
      retellingIdea: options.retelling ?? '',
      ...DEFAULT_META,
    },
    candidates: candidates.map((candidate) => ({
      keep: true,
      start: candidate.start,
      end: candidate.end,
      text: candidate.text,
      retellingIdea: '',
    })),
  }

  const path = join(directory, 'candidates.json')
  writeJson(path, review)
  reportCandidates(review, path, video)
  return { words, review, path }
}

function reportCandidates(review, path, video) {
  info(`${review.candidates.length} extraits candidats — ${video.title || 'titre inconnu'}`)
  for (const candidate of review.candidates) {
    const duration = (candidate.end - candidate.start).toFixed(1).padStart(5)
    console.log(`\n  [ ] ${formatTimestamp(candidate.start)} → ${formatTimestamp(candidate.end)}  ${duration}s`)
    console.log(`      ${candidate.text}`)
  }

  console.log(`\nÀ relire : ${path}`)
  console.log('  • keep: false     pour écarter un extrait (bruit, plusieurs voix, phrase sans contexte)')
  console.log('  • retellingIdea   optionnel par extrait ; sinon meta.retellingIdea est repris')

  if (review.meta.license) {
    console.log(`\nLicence libre déclarée par YouTube : ${review.meta.license} — reportée dans meta.`)
    console.log(`  ${review.meta.attribution}`)
  } else {
    console.log('\n⚠  Aucune licence libre déclarée par YouTube : ces extraits ne sont pas rediffusables.')
    console.log('   Renseigne meta.license à la main, ou construis-les avec --personal.')
  }
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

function nextIds(existingIds, prefix, count) {
  let index = 1
  const ids = []
  while (ids.length < count) {
    const id = `${prefix}_${String(index).padStart(3, '0')}`
    index += 1
    if (!existingIds.has(id)) ids.push(id)
  }
  return ids
}

/**
 * Homebrew's `ffmpeg` is built without `libvorbis`, so the encoder is detected
 * at runtime: `libvorbis` when available, `libopus` otherwise. Opus only
 * accepts a few sample rates, 48 kHz being the one to use.
 */
let audioEncoder = null

function resolveAudioEncoder() {
  if (audioEncoder) return audioEncoder
  const listing = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout ?? ''
  audioEncoder = /\sA\S*\s+libvorbis\s/.test(listing)
    ? { name: 'libvorbis', sampleRate: 44100, quality: ['-q:a', '2'] }
    : { name: 'libopus', sampleRate: 48000, quality: ['-b:a', '48k'] }
  return audioEncoder
}

/**
 * The source is always a WAV, i.e. uncompressed PCM with no keyframes, so an
 * input seek is sample-accurate. Placing `-ss` before `-i` therefore stays
 * exact while skipping the decode of everything before the excerpt — which
 * matters when cutting dozens of excerpts from a 25 minute conversation.
 */
function cutExcerpt(sourcePath, targetPath, candidate, options) {
  const duration = candidate.end + TAIL_PAD_SECONDS - candidate.start
  const encoder = resolveAudioEncoder()
  mkdirSync(dirname(targetPath), { recursive: true })
  runTool('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    candidate.start.toFixed(3),
    '-t',
    duration.toFixed(3),
    '-i',
    sourcePath,
    '-ac',
    '1',
    '-ar',
    String(encoder.sampleRate),
    '-c:a',
    encoder.name,
    ...encoder.quality,
    ...(options.dryRun ? ['-f', 'null', '-'] : [targetPath]),
  ])
}

function checkMeta(meta, video) {
  const problems = []
  if (!meta.source?.trim()) problems.push('meta.source (nom de la source)')
  if (!/^https:\/\//.test(meta.sourceUrl ?? '')) problems.push('meta.sourceUrl (URL https de la page d’origine)')
  if (!ALLOWED_LICENSES.includes(meta.license)) {
    problems.push(`meta.license (parmi ${ALLOWED_LICENSES.join(', ')})`)
  }
  if (!meta.attribution?.trim()) problems.push('meta.attribution (crédit et notice de modification)')
  if (problems.length > 0) {
    fail(
      [
        'Métadonnées de source incomplètes, rien n’a été publié :',
        ...problems.map((problem) => `  • ${problem}`),
        '',
        video.license ? `Licence annoncée par YouTube : « ${video.license} »` : '',
        'Si tu n’as pas les droits de rediffusion, n’ajoute pas cet extrait au dépôt.',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
}

/** Machine-owned marker listing the transcript ranges already cut for this
 * video. It stores the candidate bounds, not the padded `sourceRange` of the
 * entry, so the values can be compared as-is on the next run. */
function builtRangesPath(directory) {
  return join(directory, '.built.json')
}

function readBuiltRanges(directory) {
  const path = builtRangesPath(directory)
  return existsSync(path) ? readJson(path) : []
}

/** `build` re-runs often; without this, each run would duplicate every excerpt
 * under fresh ids, since nothing in the entry records which video it came from. */
function isAlreadyBuilt(candidate, builtRanges) {
  return builtRanges.some(
    (range) => Math.abs(range.start - candidate.start) < 0.05 && Math.abs(range.end - candidate.end) < 0.05,
  )
}

function buildEntries(options) {
  checkTools(['ffmpeg'])
  const directory = resolveCacheDir(options, { mustExist: true })
  const reviewPath = join(directory, 'candidates.json')
  if (!existsSync(reviewPath)) fail(`Aucune sélection à relire. Lance d'abord : candidates`)

  const review = readJson(reviewPath)
  const kept = review.candidates.filter((candidate) => candidate.keep)
  if (kept.length === 0) fail('Aucun extrait retenu (keep: true).')

  const personal = options.personal
  const target = personal ? PERSONAL_JSON : PROSODY_JSON
  const prefix = personal ? PERSONAL_PREFIX : options.prefix

  if (!personal) checkMeta(review.meta, review.video)
  const { words } = loadWords(directory, options)

  const existing = existsSync(target) ? readJson(target) : []
  const usedIds = new Set(existing.map((entry) => entry.id))
  const sourcePath = join(directory, 'source.wav')
  const builtRanges = readBuiltRanges(directory)
  const created = []
  const builtNow = []
  const rejected = []
  const skipped = []

  for (const candidate of kept) {
    if (isAlreadyBuilt(candidate, builtRanges)) {
      skipped.push(candidate)
      continue
    }

    const [id] = nextIds(usedIds, prefix, 1)
    const entry = buildProsodyEntry({
      id,
      // A per-excerpt idea wins; otherwise the video-wide one from `--retelling`.
      meta: { ...review.meta, retellingIdea: candidate.retellingIdea || review.meta.retellingIdea },
      candidate,
      words,
      personal,
    })

    const problems = validateEntry(entry, LIMITS, { personal })
    if (problems.length > 0) {
      rejected.push({ candidate, problems })
      continue
    }

    cutExcerpt(sourcePath, join(AUDIO_DIR, `${id}.ogg`), candidate, options)
    usedIds.add(id)
    created.push(entry)
    builtNow.push({ start: candidate.start, end: candidate.end })
  }

  if (!options.dryRun && created.length > 0) {
    writeJson(target, [...existing, ...created])
    writeJson(builtRangesPath(directory), [...builtRanges, ...builtNow])
  }

  reportBuild({ created, rejected, skipped, options, target })
}

function reportBuild({ created, rejected, skipped, options, target }) {
  const destination = relative(root, target)
  const action = options.dryRun ? 'valide(s)' : `ajouté(s) à ${destination}`
  info(`${created.length} extrait(s) ${action}`)

  for (const entry of created) {
    const duration = Math.max(...entry.groups.map((group) => group.end))
    console.log(`  ✓ ${entry.id}  ${duration.toFixed(1)}s  ${entry.groups.length} groupes`)
  }

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} extrait(s) déjà exporté(s) lors d'un build précédent, ignoré(s).`)
  }

  if (rejected.length > 0) {
    console.log(`\n${rejected.length} extrait(s) refusé(s) :`)
    for (const { candidate, problems } of rejected) {
      console.log(`  ✗ ${formatTimestamp(candidate.start)} → ${formatTimestamp(candidate.end)}`)
      for (const problem of problems) console.log(`      ${problem}`)
    }
  }

  if (created.length === 0 || options.dryRun) return

  if (options.personal) {
    console.log('\nExtraits privés : ils restent hors du dépôt (git-ignorés).')
    console.log('  • écoute-les et garde ceux qui valent le travail : retire les autres du JSON')
    console.log('  • intonation : les groupes sortent en « level », corrige à la main ceux que tu gardes')
    console.log('  • puis mesure les groupes sur l\'audio : python3 scripts/prosody_audio/asr_words.py && python3 scripts/prosody_audio/annotate.py')
  } else {
    console.log('\nRelance les tests : npm run test:run')
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

const COMMANDS = {
  fetch: fetchSource,
  candidates: buildCandidates,
  build: buildEntries,
}

function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.command === 'help') {
    console.log(USAGE)
    return
  }

  const run = COMMANDS[options.command]
  if (!run) fail(`Commande inconnue : ${options.command}\n\n${USAGE}`)
  if (options.command === 'fetch' && options.urls.length === 0) {
    fail('fetch a besoin de --url <url>')
  }

  // Each command re-reads its target JSON on every call, so processing the
  // videos in sequence keeps appending entries without ever reusing an id.
  const urls = options.urls.length > 0 ? options.urls : [null]
  for (const [index, url] of urls.entries()) {
    if (urls.length > 1) info(`Vidéo ${index + 1}/${urls.length} : ${url}`)
    run({ ...options, url })
  }
}

main()

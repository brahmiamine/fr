export interface SpeakOptions {
  lang?: string
  rate?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export function canSpeak(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof window.speechSynthesis?.cancel === 'function' &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  )
}

export function cancelSpeech(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}

function preferredVoice(
  synth: SpeechSynthesis,
  lang: string,
): SpeechSynthesisVoice | null {
  const voices =
    typeof synth.getVoices === 'function' ? synth.getVoices() : []
  const normalized = lang.toLowerCase()
  const language = normalized.slice(0, 2)

  return (
    voices.find(
      (voice) =>
        voice.lang.toLowerCase() === normalized && voice.localService,
    ) ??
    voices.find((voice) => voice.lang.toLowerCase() === normalized) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(language),
    ) ??
    null
  )
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  const cleanText = text.trim()
  if (!cleanText || !canSpeak()) return false

  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(cleanText)
  utterance.lang = options.lang ?? 'fr-FR'
  utterance.rate = options.rate ?? 0.95

  const voice = preferredVoice(synth, utterance.lang)
  if (voice) utterance.voice = voice

  utterance.onstart = () => options.onStart?.()
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onError?.()

  synth.cancel()
  synth.speak(utterance)
  return true
}

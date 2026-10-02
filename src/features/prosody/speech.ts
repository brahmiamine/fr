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
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  )
}

export function cancelSpeech(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  if (!text.trim() || !canSpeak()) return false

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'fr-FR'
  utterance.rate = options.rate ?? 0.95

  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (voice) =>
      voice.lang.toLowerCase() === utterance.lang.toLowerCase() &&
      voice.localService,
  ) ?? voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()),
  )
  if (preferred) utterance.voice = preferred

  utterance.onstart = () => options.onStart?.()
  utterance.onend = () => options.onEnd?.()
  utterance.onerror = () => options.onError?.()

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

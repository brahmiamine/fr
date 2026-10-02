import { useCallback, useEffect, useRef, useState } from 'react'
import { canSpeak, cancelSpeech, speakText } from '../../services/speech'
import { WaveBars } from '../ui'
import './speech.css'

let releaseActiveButton: (() => void) | null = null

export interface SpeakButtonProps {
  text: string
  label?: string
  ariaLabel?: string
  rate?: number
  compact?: boolean
}

export function SpeakButton({
  text,
  label = 'Écouter',
  ariaLabel,
  rate = 0.95,
  compact = false,
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  const ownsSpeech = useRef(false)
  const mounted = useRef(true)
  const cleanText = text.trim()

  const finish = useCallback(() => {
    ownsSpeech.current = false
    if (mounted.current) setSpeaking(false)
    if (releaseActiveButton === finish) releaseActiveButton = null
  }, [])

  useEffect(
    () => () => {
      mounted.current = false
      if (ownsSpeech.current) cancelSpeech()
      ownsSpeech.current = false
      if (releaseActiveButton === finish) releaseActiveButton = null
    },
    [finish],
  )

  if (!cleanText || !canSpeak()) return null

  const toggle = () => {
    if (ownsSpeech.current) {
      cancelSpeech()
      finish()
      return
    }

    releaseActiveButton?.()
    ownsSpeech.current = true
    releaseActiveButton = finish

    const started = speakText(cleanText, {
      lang: 'fr-FR',
      rate,
      onStart: () => {
        if (mounted.current) setSpeaking(true)
      },
      onEnd: finish,
      onError: finish,
    })

    if (!started) finish()
  }

  const accessibleLabel = ariaLabel ?? label

  return (
    <button
      type="button"
      className={`speech-button${compact ? ' speech-button--compact' : ''}${speaking ? ' is-speaking' : ''}`}
      aria-label={speaking ? `Arrêter — ${accessibleLabel}` : accessibleLabel}
      aria-pressed={speaking}
      onClick={toggle}
    >
      <WaveBars count={5} height={compact ? 14 : 16} playing={speaking} tone="accent" speed={0.9} />
      <span>{speaking ? 'Arrêter' : label}</span>
    </button>
  )
}

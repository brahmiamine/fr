import { useEffect, useRef, useState } from 'react'
import { resolveDuration } from '../../../components/AudioClip/mediaDuration'
import { VoiceWaveform } from '../../../components/AudioClip/VoiceWaveform'
import '../../../components/AudioClip/AudioClip.css'
import { cancelSpeech, speakText } from '../speech'

const PHASE_ORDER = ['model-1', 'learner', 'model-2'] as const

export interface AbaPlayerProps {
  modelSrc?: string
  modelText?: string
  modelLocale?: string
  modelRate?: number
  learnerSrc: string
  start: number
  end: number
  onComplete: () => void
}

type Phase = 'idle' | 'model-1' | 'learner' | 'model-2'

export function AbaPlayer({
  modelSrc,
  modelText,
  modelLocale,
  modelRate,
  learnerSrc,
  start,
  end,
  onComplete,
}: AbaPlayerProps) {
  const modelRef = useRef<HTMLAudioElement | null>(null)
  const learnerRef = useRef<HTMLAudioElement | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const [phase, setPhase] = useState<Phase>('idle')
  // Share of the current phase already played (0–1); each of A, B, A is a third of the bar.
  const [phaseProgress, setPhaseProgress] = useState(0)
  const speechStartRef = useRef(0)

  useEffect(() => () => cancelSpeech(), [])

  const changePhase = (next: Phase) => {
    phaseRef.current = next
    setPhase(next)
    setPhaseProgress(0)
  }

  // Synthesised model: no position is reported, so animate against an estimated length.
  useEffect(() => {
    if (!modelText || (phase !== 'model-1' && phase !== 'model-2')) return
    const total = Math.max(1.5, modelText.length / (14 * Math.max(0.5, modelRate ?? 1))) * 1000
    speechStartRef.current = Date.now()
    const id = window.setInterval(() => {
      setPhaseProgress(Math.min(0.97, (Date.now() - speechStartRef.current) / total))
    }, 100)
    return () => window.clearInterval(id)
  }, [modelText, modelRate, phase])

  const finishSpokenModel = () => {
    if (phaseRef.current === 'model-1') {
      const learner = learnerRef.current
      if (!learner) return changePhase('idle')
      changePhase('learner')
      learner.currentTime = 0
      void learner.play().catch(() => changePhase('idle'))
    } else if (phaseRef.current === 'model-2') {
      changePhase('idle')
      onComplete()
    }
  }

  const playModel = (next: 'model-1' | 'model-2') => {
    changePhase(next)
    if (modelText) {
      const ok = speakText(modelText, {
        lang: modelLocale,
        rate: modelRate,
        onEnd: finishSpokenModel,
        onError: () => changePhase('idle'),
      })
      if (!ok) changePhase('idle')
      return
    }
    const model = modelRef.current
    if (!model) return changePhase('idle')
    model.currentTime = start
    void model.play().catch(() => changePhase('idle'))
  }

  const startSequence = () => {
    if (phaseRef.current !== 'idle') return
    playModel('model-1')
  }

  const finishModelSegment = () => {
    const model = modelRef.current
    if (!model) return
    model.pause()
    finishSpokenModel()
  }

  const handleModelTimeUpdate = () => {
    const model = modelRef.current
    if (!model) return
    if (end > start) {
      setPhaseProgress(Math.min(1, Math.max(0, (model.currentTime - start) / (end - start))))
    }
    if (model.currentTime >= end) finishModelSegment()
  }

  const handleLearnerTimeUpdate = () => {
    const learner = learnerRef.current
    if (learner && Number.isFinite(learner.duration) && learner.duration > 0) {
      setPhaseProgress(Math.min(1, learner.currentTime / learner.duration))
    }
  }

  const handleLearnerEnded = () => {
    if (phaseRef.current === 'learner') playModel('model-2')
  }

  const running = phase !== 'idle'
  const phaseLabel = phase === 'model-1' ? 'A — modèle' : phase === 'learner' ? 'B — toi' : phase === 'model-2' ? 'A — modèle' : 'Prêt : A → B → A'
  const phaseIndex = PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number])
  const progress = phase === 'idle' ? 0 : (phaseIndex + phaseProgress) / PHASE_ORDER.length

  return (
    <div className="audio-clip aba-player">
      <button
        type="button"
        className="audio-player__play"
        onClick={startSequence}
        disabled={running}
        aria-label="Comparer automatiquement A → B → A"
      >
        <span aria-hidden="true">▶</span>
      </button>
      <div className="audio-player__body">
        <VoiceWaveform progress={progress} label="Progression A → B → A" />
        <div className="audio-player__meta">
          <p className="audio-player__caption" aria-live="polite">{phaseLabel}</p>
        </div>
      </div>
      {!modelText && modelSrc ? (
        <audio ref={modelRef} src={modelSrc} preload="metadata" onTimeUpdate={handleModelTimeUpdate} />
      ) : null}
      <audio
        ref={learnerRef}
        src={learnerSrc}
        preload="metadata"
        onLoadedMetadata={(event) => resolveDuration(event.currentTarget, () => undefined)}
        onTimeUpdate={handleLearnerTimeUpdate}
        onEnded={handleLearnerEnded}
      />
    </div>
  )
}

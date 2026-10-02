import { useEffect, useRef, useState } from 'react'
import { cancelSpeech, speakText } from '../speech'

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

  useEffect(() => () => cancelSpeech(), [])

  const changePhase = (next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }

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
    if (model && model.currentTime >= end) finishModelSegment()
  }

  const handleLearnerEnded = () => {
    if (phaseRef.current === 'learner') playModel('model-2')
  }

  const running = phase !== 'idle'
  const phaseLabel = phase === 'model-1' ? 'A — modèle' : phase === 'learner' ? 'B — toi' : phase === 'model-2' ? 'A — modèle' : 'Prêt'

  return (
    <div className="aba-player">
      <button type="button" className="button button--gradient button--block" onClick={startSequence} disabled={running}>
        ▶ Comparer automatiquement A → B → A
      </button>
      <p className="muted" aria-live="polite">{phaseLabel}</p>
      {!modelText && modelSrc ? (
        <audio ref={modelRef} src={modelSrc} preload="metadata" onTimeUpdate={handleModelTimeUpdate} />
      ) : null}
      <audio ref={learnerRef} src={learnerSrc} preload="metadata" onEnded={handleLearnerEnded} />
    </div>
  )
}

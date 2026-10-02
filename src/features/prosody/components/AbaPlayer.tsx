import { useRef, useState } from 'react'

export interface AbaPlayerProps {
  modelSrc: string
  learnerSrc: string
  start: number
  end: number
  onComplete: () => void
}

type Phase = 'idle' | 'model-1' | 'learner' | 'model-2'

export function AbaPlayer({
  modelSrc,
  learnerSrc,
  start,
  end,
  onComplete,
}: AbaPlayerProps) {
  const modelRef = useRef<HTMLAudioElement | null>(null)
  const learnerRef = useRef<HTMLAudioElement | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const [phase, setPhase] = useState<Phase>('idle')

  const changePhase = (next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }

  const playModel = (next: 'model-1' | 'model-2') => {
    const model = modelRef.current
    if (!model) return
    changePhase(next)
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

    if (phaseRef.current === 'model-1') {
      const learner = learnerRef.current
      if (!learner) {
        changePhase('idle')
        return
      }
      changePhase('learner')
      learner.currentTime = 0
      void learner.play().catch(() => changePhase('idle'))
      return
    }

    if (phaseRef.current === 'model-2') {
      changePhase('idle')
      onComplete()
    }
  }

  const handleModelTimeUpdate = () => {
    const model = modelRef.current
    if (model && model.currentTime >= end) finishModelSegment()
  }

  const handleLearnerEnded = () => {
    if (phaseRef.current === 'learner') playModel('model-2')
  }

  const running = phase !== 'idle'
  const phaseLabel =
    phase === 'model-1'
      ? 'A — modèle'
      : phase === 'learner'
        ? 'B — toi'
        : phase === 'model-2'
          ? 'A — modèle'
          : 'Prêt'

  return (
    <div className="aba-player">
      <button
        type="button"
        className="button button--gradient button--block"
        onClick={startSequence}
        disabled={running}
      >
        ▶ Comparer automatiquement A → B → A
      </button>
      <p className="muted" aria-live="polite">
        {phaseLabel}
      </p>
      <audio
        ref={modelRef}
        src={modelSrc}
        preload="metadata"
        onTimeUpdate={handleModelTimeUpdate}
      />
      <audio
        ref={learnerRef}
        src={learnerSrc}
        preload="metadata"
        onEnded={handleLearnerEnded}
      />
    </div>
  )
}

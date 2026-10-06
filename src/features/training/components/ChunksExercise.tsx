import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Chunk } from '../../../types/content'
import { SpeakButton } from '../../../components/Speech/SpeakButton'
import { NativeClip } from '../../../components/AudioClip/NativeClip'
import { Timer } from '../../../components/Timer/Timer'
import { Button, Card, ChoiceButton, ChoiceGrid, Eyebrow, Pill } from '../../../components/ui'
import type { ChoiceTone } from '../../../components/ui'
import type { RecallResult } from '../types'

export interface ChunksExerciseProps {
  chunk: Chunk
  index: number
  total: number
  step: 'retrieve' | 'revealed' | 'day'
  chunksOfDay: Chunk[]
  /** First encounter: the chunk is discovered, not retrieved. */
  isNew?: boolean
  onReveal: () => void
  onRate: (result: RecallResult) => void
  onContinue: () => void
}

interface RatingOption {
  result: RecallResult
  label: string
  hint: string
  tone: ChoiceTone
}

const NEW_RATINGS: RatingOption[] = [
  { result: 'easy', label: 'Je la connaissais déjà', hint: 'Elle reviendra plus tard', tone: 'success' },
  { result: 'discovered', label: 'Nouvelle pour moi', hint: 'Je la retrouverai demain', tone: 'accent' },
]

const RECALL_RATINGS: RatingOption[] = [
  { result: 'easy', label: 'Trouvé facilement', hint: 'Prochaine révision plus espacée', tone: 'success' },
  { result: 'difficult', label: 'Trouvé avec difficulté', hint: 'Pas encore de maîtrise', tone: 'warning' },
  { result: 'failed', label: "Je ne l'ai pas retrouvé", hint: 'Le parcours repart à zéro', tone: 'danger' },
]

function ChunkTopline({
  index,
  total,
  isNew,
  chunk,
}: {
  index: number
  total: number
  isNew: boolean
  chunk: Chunk
}) {
  return (
    <div className="exercise-topline">
      <span className="exercise-topline__label">
        Chunk {index + 1}/{total}
        {isNew ? ' · Nouveau' : ''}
      </span>
      <div className="row">
        {isNew ? (
          <Pill tone="warm" pop>
            Nouveau
          </Pill>
        ) : null}
        <Pill>
          {chunk.level} · {chunk.register ?? 'courant'}
        </Pill>
      </div>
    </div>
  )
}

function ChunksOfDay({ chunksOfDay, onContinue }: { chunksOfDay: Chunk[]; onContinue: () => void }) {
  return (
    <Card enter="pop" className="chunks-day">
      <Eyebrow>Tes chunks du jour</Eyebrow>
      <h2>Essaie d'utiliser aujourd'hui :</h2>
      <ul className="chunks-day__list">
        {chunksOfDay.map((item, position) => (
          <li key={item.id} style={{ animationDelay: `${0.1 + position * 0.08}s` }}>
            <span className="chunks-day__expr">« {item.expression} »</span>
            <SpeakButton
              text={item.expression}
              label="Écouter"
              ariaLabel={`Écouter ${item.expression}`}
              compact
            />
          </li>
        ))}
      </ul>
      <p className="muted">
        Ces expressions seront rappelées pendant le 4 → 3 → 2 et les questions
        surprises. À la fin, tu confirmeras celles que tu as réellement placées.
      </p>
      <p className="muted">
        Varie-les : la même formule toutes les 20 secondes sonne aussi artificiel
        qu'un manuel.
      </p>
      <Button block size="lg" trailing="→" onClick={onContinue}>
        Continuer
      </Button>
    </Card>
  )
}

/** 3D card: the intention on the front, the expression on the back. */
function FlipCard({ revealed, front, back }: { revealed: boolean; front: ReactNode; back: ReactNode }) {
  return (
    <div className="flip">
      <div className={`flip__inner${revealed ? ' is-revealed' : ''}`}>
        <div className="flip__face flip__face--front">{front}</div>
        <div className="flip__face flip__face--back on-gradient">{back}</div>
      </div>
    </div>
  )
}

export function ChunksExercise({
  chunk,
  index,
  total,
  step,
  chunksOfDay,
  isNew = false,
  onReveal,
  onRate,
  onContinue,
}: ChunksExerciseProps) {
  const [ready, setReady] = useState(false)

  if (step === 'day') {
    return <ChunksOfDay chunksOfDay={chunksOfDay} onContinue={onContinue} />
  }

  const revealed = step === 'revealed'
  const ratings = isNew ? NEW_RATINGS : RECALL_RATINGS

  const front = (
    <>
      <Eyebrow>Intention</Eyebrow>
      <h1 className="flip__intent">{chunk.intent}</h1>
      {!revealed && !ready ? (
        <div className="row flip__countdown">
          <Timer
            durationSeconds={3}
            autoStart
            compact
            secondsOnly
            hideControls
            variant="bubble"
            onComplete={() => setReady(true)}
          />
          <p className="muted">Prépare-toi…</p>
        </div>
      ) : null}
      {!revealed && ready ? (
        <div className="flip__hint">
          {isNew ? (
            <>
              <p className="muted">
                Nouveau chunk : tu ne l'as encore jamais travaillé. Propose une
                expression possible, puis découvre celle du jour.
              </p>
              <p className="text-strong">Dis ta proposition à voix haute.</p>
            </>
          ) : (
            <>
              <p className="muted">Retrouve l'expression travaillée, à voix haute.</p>
              <p className="text-strong">
                Avant de vérifier, dis 2 phrases différentes avec elle.
              </p>
            </>
          )}
        </div>
      ) : null}
    </>
  )

  const back = revealed ? (
    <>
      <span className="flip__meta">
        {chunk.intent} · registre {chunk.register ?? 'courant'}
      </span>
      <p className="flip__expression">« {chunk.expression} »</p>
      {chunk.spoken ? (
        <p className="flip__tip">
          À l'oral : <strong>« {chunk.spoken} »</strong>
        </p>
      ) : null}
      {chunk.usageTip ? <p className="flip__tip">{chunk.usageTip}</p> : null}
      <p className="flip__instruction">
        {isNew
          ? 'Fais maintenant 2 ou 3 phrases différentes avec cette expression, à voix haute.'
          : "Tes 2 phrases utilisaient-elles exactement cette expression ? Sinon, refais-en une avec la bonne forme."}
      </p>
      <SpeakButton text={chunk.expression} label="Écouter" ariaLabel="Écouter l'expression" />
    </>
  ) : null

  return (
    <section className="exercise screen-enter" aria-live="polite">
      <ChunkTopline index={index} total={total} isNew={isNew} chunk={chunk} />
      <FlipCard revealed={revealed} front={front} back={back} />
      {revealed && chunk.nativeClip ? <NativeClip clip={chunk.nativeClip} /> : null}

      {!revealed && ready ? (
        <Button variant="animated" size="lg" block trailing="→" onClick={onReveal}>
          {isNew ? "Découvrir l'expression" : "Voir l'expression"}
        </Button>
      ) : null}

      {revealed ? (
        <ChoiceGrid min={170}>
          {ratings.map((option, position) => (
            <ChoiceButton
              key={option.result}
              tone={option.tone}
              hint={option.hint}
              delay={0.35 + position * 0.06}
              onClick={() => onRate(option.result)}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </ChoiceGrid>
      ) : null}
    </section>
  )
}

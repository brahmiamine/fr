import { useState } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import { Button, TextField } from '../../components/ui'
import { deleteWordGap, editWordGap } from '../../services/progress/progress'
import type { WordGap } from '../../types/progress'
import { QuickWordGap } from './QuickWordGap'
import './wordGaps.css'

function GapRow({ gap }: { gap: WordGap }) {
  const { updateWith } = useAppState()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [target, setTarget] = useState(gap.target)
  const [context, setContext] = useState(gap.context)

  if (editing) {
    return (
      <li className="history__item">
        <div className="gap-list__edit">
          <TextField id={`gap-edit-word-${gap.id}`} label="Mot" value={target} onChange={setTarget} />
          <TextField
            id={`gap-edit-idea-${gap.id}`}
            label="L'idée, sans le mot"
            value={context}
            onChange={setContext}
          />
          <div className="gap-list__actions">
            <Button
              variant="subtle"
              size="sm"
              disabled={!target.trim() || !context.trim()}
              onClick={() => {
                updateWith((prev) => editWordGap(prev, gap.id, { target, context }))
                setEditing(false)
              }}
            >
              Enregistrer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTarget(gap.target)
                setContext(gap.context)
                setEditing(false)
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="history__item">
      <div>
        <p className="history__date">{gap.target}</p>
        {gap.context ? (
          <p className="muted history__note">Idée : {gap.context}</p>
        ) : (
          <p className="muted history__note">Ancien mot sans contexte enregistré</p>
        )}
        {gap.timesBlocked ? (
          <p className="muted history__note">Bloqué encore {gap.timesBlocked} fois depuis</p>
        ) : null}
      </div>
      <div className="history__meta gap-list__actions">
        <span className="pill">
          {gap.status === 'mastered' ? 'Maîtrisé' : `Prochain : ${gap.nextReview}`}
        </span>
        <button type="button" className="chip" onClick={() => setEditing(true)}>
          Modifier
        </button>
        <button
          type="button"
          className={`chip${confirmDelete ? ' is-active' : ''}`}
          aria-label={confirmDelete ? `Confirmer la suppression de ${gap.target}` : `Supprimer ${gap.target}`}
          onClick={() => {
            if (confirmDelete) updateWith((prev) => deleteWordGap(prev, gap.id))
            else setConfirmDelete(true)
          }}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? 'Confirmer ?' : 'Supprimer'}
        </button>
      </div>
    </li>
  )
}

/** "Mes trous de mots": add a word met elsewhere, correct a typo, remove a wrong one. */
export function WordGapList() {
  const { state } = useAppState()
  const gaps = [...state.wordGaps].sort((a, b) => a.nextReview.localeCompare(b.nextReview))
  return (
    <section className="card card--md" aria-labelledby="gaps-title">
      <h2 id="gaps-title">Mes trous de mots</h2>
      <p className="muted">
        Les mots que tu as cherchés en parlant. Chacun revient à J+1, J+3 et J+7 ; si tu
        bloques encore dessus, il recommence.
      </p>
      <QuickWordGap id="progress-gap" limited={false} label="Ajouter un mot" />
      {gaps.length > 0 ? (
        <ul className="history">
          {gaps.map((gap) => (
            <GapRow key={gap.id} gap={gap} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

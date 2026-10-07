import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Button, TextField } from '../../components/ui'
import { LIMIT_MESSAGE, useWordGapCapture } from './useWordGapCapture'
import './wordGaps.css'

export interface QuickWordGapProps {
  /** Prefix of the field ids, unique on the screen. */
  id: string
  /** Opened from the start instead of behind the "➕" button. */
  defaultOpen?: boolean
  /** Daily cap on new words (off in the Progress list, where the learner manages them). */
  limited?: boolean
  label?: string
}

/**
 * "➕ Mot qui m'a manqué": the word, the idea without it, and it is in the
 * personal word gaps at once. Offered between two speaking turns only —
 * never while the timer runs ("ne te corrige jamais pendant que tu parles").
 */
export function QuickWordGap({
  id,
  defaultOpen = false,
  limited = true,
  label = "Mot qui m'a manqué",
}: QuickWordGapProps) {
  const { capture, remaining, available } = useWordGapCapture(limited)
  const [open, setOpen] = useState(defaultOpen)
  const [word, setWord] = useState('')
  const [idea, setIdea] = useState('')
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState<string[]>([])

  if (!available) return null

  // Not a <form>: this block also sits inside the feedback forms.
  const submit = () => {
    const result = capture(word, idea)
    if (result === 'limit') {
      setMessage(LIMIT_MESSAGE)
      return
    }
    if (result !== 'added' && result !== 'again') return
    setSaved((previous) => [...previous, word.trim()])
    setMessage(
      result === 'again'
        ? `« ${word.trim()} » était déjà dans ta liste : il revient demain.`
        : `« ${word.trim()} » rejoint tes trous de mots : tu devras le retrouver demain.`,
    )
    setWord('')
    setIdea('')
  }

  // Enter adds the word instead of submitting the surrounding form.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (word.trim() && idea.trim()) submit()
  }

  if (!open) {
    return (
      <div className="quick-gap">
        <button
          type="button"
          className="quick-gap__toggle"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          ➕ {label}
        </button>
        {saved.length > 0 ? <p className="muted quick-gap__saved">Notés : {saved.join(', ')}</p> : null}
      </div>
    )
  }

  return (
    <div className="quick-gap quick-gap--open" role="group" aria-label={label}>
      <p className="quick-gap__title">➕ {label}</p>
      <TextField
        id={`${id}-word`}
        label="Mot"
        value={word}
        onChange={setWord}
        placeholder="ex. échéance"
        onKeyDown={onKeyDown}
      />
      <TextField
        id={`${id}-idea`}
        label="Ce que je voulais dire (sans le mot)"
        value={idea}
        onChange={setIdea}
        placeholder="ex. la date limite pour payer"
        onKeyDown={onKeyDown}
        hint="C'est cette idée qui te sera montrée pour retrouver le mot."
      />
      <Button type="button" variant="subtle" block disabled={!word.trim() || !idea.trim()} onClick={submit}>
        Ajouter
      </Button>
      {message ? (
        <p className="muted quick-gap__message" role="status">
          {message}
        </p>
      ) : null}
      {limited && remaining <= 2 && remaining > 0 ? (
        <p className="muted quick-gap__message">Encore {remaining} nouveau(x) mot(s) possible(s) aujourd'hui.</p>
      ) : null}
    </div>
  )
}

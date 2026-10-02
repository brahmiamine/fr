import { useEffect, useId, useRef, useState } from 'react'
import { EXERCISE_INFO } from '../../data/exerciseInfo'
import type { ExerciseInfoId } from '../../data/exerciseInfo'

/** ⓘ button opening a short explanation of an exercise and what it improves. */
export function InfoButton({
  id,
  className,
}: {
  id: ExerciseInfoId
  className?: string
}) {
  const info = EXERCISE_INFO[id]
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`info-button${className ? ` ${className}` : ''}`}
        aria-label={`Infos : ${info.title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">i</span>
      </button>

      {open ? (
        <div className="info-dialog__backdrop" onClick={close}>
          <div
            className="info-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-dialog__head">
              <h2 id={titleId}>{info.title}</h2>
              <span className="pill pill--soft">{info.duration}</span>
            </div>

            <p>{info.what}</p>

            <h3>Comment faire</h3>
            <ol>
              {info.how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <h3>Ce que ça améliore à l'oral</h3>
            <ul>
              {info.improves.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {info.tip ? <p className="info-dialog__tip">{info.tip}</p> : null}

            <button
              ref={closeRef}
              type="button"
              className="button button--block"
              onClick={close}
            >
              Compris
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

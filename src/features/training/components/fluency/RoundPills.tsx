import { FLUENCY_ROUND_SECONDS } from '../../types'

export const ROUND_LABELS = [
  'Tour 1 — 4:00',
  'Tour 2 — 3:00',
  'Tour 3 — 2:00',
  'Transfert — 1:00',
]

/** The four rounds as a row of pills: done, current, upcoming. */
export function RoundPills({ roundIndex, done = false }: { roundIndex: number; done?: boolean }) {
  return (
    <ol className="round-pills" aria-hidden="true">
      {FLUENCY_ROUND_SECONDS.map((_, index) => {
        const state =
          index < roundIndex || (done && index === roundIndex)
            ? 'done'
            : index === roundIndex
              ? 'current'
              : 'next'
        return (
          <li key={index} className={`round-pills__item is-${state}`}>
            {ROUND_LABELS[index]}
          </li>
        )
      })}
    </ol>
  )
}

import { FLUENCY_ROUND_SECONDS, roundLabels } from '../../types'

export const ROUND_LABELS = roundLabels(FLUENCY_ROUND_SECONDS)

/** The four rounds as a row of pills: done, current, upcoming. */
export function RoundPills({
  roundIndex,
  done = false,
  roundSeconds = FLUENCY_ROUND_SECONDS,
}: {
  roundIndex: number
  done?: boolean
  roundSeconds?: readonly number[]
}) {
  const labels = roundLabels(roundSeconds)
  return (
    <ol className="round-pills" aria-hidden="true">
      {roundSeconds.map((_, index) => {
        const state =
          index < roundIndex || (done && index === roundIndex)
            ? 'done'
            : index === roundIndex
              ? 'current'
              : 'next'
        return (
          <li key={index} className={`round-pills__item is-${state}`}>
            {labels[index]}
          </li>
        )
      })}
    </ol>
  )
}

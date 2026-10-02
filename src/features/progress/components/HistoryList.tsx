import type { ReactNode } from 'react'
import { Card } from '../../../components/ui'

export interface HistoryEntry {
  key: string
  title: ReactNode
  notes?: ReactNode[]
  tags: ReactNode[]
}

/** Card with a titled list of entries and pill tags. */
export function HistoryCard({
  id,
  title,
  summary,
  entries,
  empty,
}: {
  id: string
  title: string
  summary?: ReactNode
  entries: HistoryEntry[]
  empty?: ReactNode
}) {
  return (
    <Card padding="md" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {summary}
      {entries.length > 0 ? (
        <ul className="history">
          {entries.map((entry) => (
            <li key={entry.key} className="history__item">
              <div>
                <p className="history__date">{entry.title}</p>
                {entry.notes?.map((note, index) => (
                  <p key={index} className="muted history__note">
                    {note}
                  </p>
                ))}
              </div>
              <div className="history__meta">
                {entry.tags.map((tag, index) => (
                  <span key={index} className="pill">
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </Card>
  )
}

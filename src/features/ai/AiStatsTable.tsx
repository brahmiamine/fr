import { useEffect, useState } from 'react'
import { Button, MiniStat } from '../../components/ui'
import { AI_PROVIDERS } from '../../services/ai/client'
import {
  AI_STATS_EVENT,
  clearAiStats,
  loadAiStats,
} from '../../services/ai/stats'
import type { AiUsageStat } from '../../services/ai/stats'
import './ai.css'

const nf = new Intl.NumberFormat('fr-FR')

function providerLabel(id: string): string {
  return AI_PROVIDERS.find((provider) => provider.id === id)?.label ?? id
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.round(bytes / 1024)} Ko`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function Row({ stat }: { stat: AiUsageStat }) {
  const average = stat.successes > 0 ? Math.round(stat.totalLatencyMs / stat.successes) : null
  return (
    <li className="ai-stat">
      <h4 className="ai-stat__title">
        <strong>{providerLabel(stat.provider)}</strong>
        <span className="muted">
          {' '}· {stat.model || 'modèle inconnu'}
          {stat.kind === 'audio' ? ' (transcription)' : ''}
        </span>
      </h4>
      <dl className="ai-stat__grid">
        <div><dt>Requêtes</dt><dd>{nf.format(stat.requests)}</dd></div>
        <div><dt>Réussies</dt><dd>{nf.format(stat.successes)}</dd></div>
        <div><dt>Échecs</dt><dd>{nf.format(stat.failures)}</dd></div>
        {stat.kind === 'text' ? (
          <>
            <div><dt>Tokens envoyés</dt><dd>{nf.format(stat.promptTokens)}</dd></div>
            <div><dt>Tokens reçus</dt><dd>{nf.format(stat.completionTokens)}</dd></div>
            <div><dt>Tokens au total</dt><dd>{nf.format(stat.totalTokens)}</dd></div>
          </>
        ) : (
          <>
            <div><dt>Audio envoyé</dt><dd>{formatBytes(stat.audioBytes)}</dd></div>
            <div><dt>Mots transcrits</dt><dd>{nf.format(stat.words)}</dd></div>
          </>
        )}
        <div><dt>Temps moyen</dt><dd>{average === null ? '—' : `${nf.format(average)} ms`}</dd></div>
        <div><dt>Dernier usage</dt><dd>{formatDate(stat.lastUsed)}</dd></div>
      </dl>
    </li>
  )
}

/** Usage of each model on this device, kept in the browser only. */
export function AiStatsTable() {
  const [stats, setStats] = useState(loadAiStats)

  useEffect(() => {
    const refresh = () => setStats(loadAiStats())
    window.addEventListener(AI_STATS_EVENT, refresh)
    return () => window.removeEventListener(AI_STATS_EVENT, refresh)
  }, [])

  const rows = Object.values(stats).sort((a, b) => b.requests - a.requests)
  const totals = rows.reduce(
    (sum, stat) => ({
      requests: sum.requests + stat.requests,
      failures: sum.failures + stat.failures,
      tokens: sum.tokens + stat.totalTokens,
    }),
    { requests: 0, failures: 0, tokens: 0 },
  )

  return (
    <div className="ai-stats">
      <h3>Statistiques d'utilisation</h3>
      <p className="muted">
        Comptées sur cet appareil seulement. Les tokens sont ceux que renvoient les
        fournisseurs ; certains n'en donnent pas.
      </p>
      {rows.length === 0 ? (
        <p className="muted">Aucune requête pour l'instant.</p>
      ) : (
        <>
          <div className="mini-stats ai-stats__totals">
            <MiniStat tone="soft" value={nf.format(totals.requests)} label="requêtes" />
            <MiniStat tone="soft" value={nf.format(totals.failures)} label="échecs" />
            <MiniStat tone="soft" value={nf.format(totals.tokens)} label="tokens" />
          </div>
          <ul className="ai-stat-list">
            {rows.map((stat) => (
              <Row key={`${stat.provider}:${stat.kind}`} stat={stat} />
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="ai-stats__reset" onClick={clearAiStats}>
            Réinitialiser les statistiques
          </Button>
        </>
      )}
    </div>
  )
}

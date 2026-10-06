import { Link } from 'react-router-dom'
import { Button, WaveBars } from '../../../components/ui'

export function ProsodyPromo({ ready, completed }: { ready: boolean; completed: number }) {
  const content = (
    <>
      <WaveBars count={14} height={34} tone="white" speed={1.1} />
      <h3>Sonner plus naturel</h3>
      <p>
        Entraîne le rythme et l'intonation : écoute, imite, compare et
        reformule. Objectif : une boucle approfondie de 12–15 min.
      </p>
      {completed > 0 ? (
        <p className="prosody-promo__count">
          {completed} séance{completed > 1 ? 's' : ''} terminée{completed > 1 ? 's' : ''}.
        </p>
      ) : null}
    </>
  )

  if (!ready) {
    return (
      <div className="prosody-promo prosody-promo--disabled">
        {content}
        <Button variant="subtle" disabled>
          Audio naturel à ajouter
        </Button>
      </div>
    )
  }

  return (
    <div className="prosody-promo-wrap">
      <Link to="/prosody" className="prosody-promo">
        {content}
        <span className="prosody-promo__cta">Commencer →</span>
      </Link>
      <Link to="/prosody/pairs" className="prosody-promo__pairs">
        Paires d'intonation · 2 min
      </Link>
    </div>
  )
}

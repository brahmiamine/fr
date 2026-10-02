import { useState } from 'react'
import { SpeakButton } from '../../../../components/Speech/SpeakButton'
import { Button, Callout } from '../../../../components/ui'
import type { RetellingStory } from '../../../../types/content'

export function RetellingStoryBox({ story }: { story: RetellingStory }) {
  const [showText, setShowText] = useState(false)
  return (
    <Callout title="Écoute d'abord l'histoire">
      <p className="muted">
        Écoute-la sans lire, repère 2–3 expressions, puis raconte-la avec tes
        propres mots pendant les tours 4 → 3 → 2.
      </p>
      <SpeakButton text={story.text} label="Écouter l'histoire" ariaLabel="Écouter l'histoire" />
      {showText ? (
        <p className="retelling-story" lang="fr">
          {story.text}
        </p>
      ) : (
        <Button variant="dashed" block onClick={() => setShowText(true)}>
          Lire le texte (seulement si l'audio ne marche pas)
        </Button>
      )}
    </Callout>
  )
}

import { useState } from 'react'
import { AudioClip } from '../../../../components/AudioClip/AudioClip'
import { SpeakButton } from '../../../../components/Speech/SpeakButton'
import { Button, Callout } from '../../../../components/ui'
import { assetUrl } from '../../../../services/assets'
import type { RetellingStory } from '../../../../types/content'

export function RetellingStoryBox({ story }: { story: RetellingStory }) {
  const [showText, setShowText] = useState(false)
  return (
    <Callout title={story.audio ? "Écoute d'abord l'extrait" : "Écoute d'abord l'histoire"}>
      <p className="muted">
        Écoute-la sans lire, repère 2–3 expressions, puis raconte-la avec tes
        propres mots pendant les tours 4 → 3 → 2.
      </p>
      {story.audio ? (
        <>
          <AudioClip src={assetUrl(story.audio)} label="Écouter l'extrait (vraie voix)" />
          {story.attribution ? (
            <p className="muted">
              {story.attribution}
              {story.sourceUrl ? (
                <>
                  {' '}
                  <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                    Source et licence
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </>
      ) : (
        <SpeakButton text={story.text} label="Écouter l'histoire" ariaLabel="Écouter l'histoire" />
      )}
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

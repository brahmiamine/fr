import { ButtonLink, AiFrame, AiMark, AiTag } from '../../../components/ui'

/** Entry to the free-training coach (only shown while AI is switched on). */
export function CoachPromo() {
  return (
    <AiFrame as="section" className="coach-promo" aria-labelledby="coach-promo-title">
      <div className="coach-promo__row">
        <AiMark size={52} />
        <div className="coach-promo__text">
          <div className="row">
            <h3 id="coach-promo-title">Coach IA</h3>
            <AiTag>Entraînement libre</AiTag>
          </div>
          <p className="muted">
            Des questions surprises générées sur le thème de ton choix, ou un jeu de rôle
            façon messagerie.
          </p>
        </div>
        <div className="coach-promo__actions">
          <ButtonLink to="/coach" variant="accent-outline" className="coach-promo__ghost">
            Question surprise
          </ButtonLink>
          <ButtonLink to="/coach?mode=roleplay" trailing="→">
            Jeu de rôle
          </ButtonLink>
        </div>
      </div>
    </AiFrame>
  )
}

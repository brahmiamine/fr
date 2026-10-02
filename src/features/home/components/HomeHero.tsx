import { HeroIllustration } from '../../../components/Decor/Decor'
import { Eyebrow } from '../../../components/ui'

export function HomeHero({ minutes, prepSeconds }: { minutes: number; prepSeconds: number }) {
  return (
    <header className="home-hero">
      <div className="home-hero__copy">
        <Eyebrow gradient>Ton coach de français parlé</Eyebrow>
        <h1>
          Prêt pour <span className="home-hero__accent">ta séance ?</span>
        </h1>
        <p className="home-hero__lead">
          Aujourd'hui : environ {minutes} min, guidé étape par étape. Préparation
          surprise : {prepSeconds} s.
        </p>
      </div>
      <div className="home-hero__art">
        <HeroIllustration />
      </div>
    </header>
  )
}

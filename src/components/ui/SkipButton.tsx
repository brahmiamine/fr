import { useSettings } from '../../app/SettingsProvider'
import { Button } from './Button'

/** "Passer" action shown under every exercise; hidden when disabled in the settings. */
export function SkipButton({
  onClick,
  children = 'Passer',
}: {
  onClick: () => void
  children?: string
}) {
  const { settings } = useSettings()
  if (!settings.allowSkip) return null
  return (
    <Button variant="subtle" block className="skip-button" onClick={onClick}>
      {children}
    </Button>
  )
}

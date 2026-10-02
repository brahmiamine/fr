/**
 * Resolve a repository-relative asset path against the Vite base, so that
 * public assets work correctly on GitHub Pages under /fr/.
 *
 *   assetUrl('audio/prosody/prosody_001.mp3')
 *   // -> '/fr/audio/prosody/prosody_001.mp3'
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

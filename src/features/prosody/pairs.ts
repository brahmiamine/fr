import pairsData from '../../data/intonation-pairs.json'

export type PairMovement = 'rise' | 'fall' | 'level'

export interface IntonationAttitude {
  kind: string
  label: string
  text: string
  movement: PairMovement
}

export interface IntonationPair {
  id: string
  base: string
  attitudes: IntonationAttitude[]
}

export const intonationPairs = pairsData as unknown as IntonationPair[]

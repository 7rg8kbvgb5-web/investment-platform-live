import { fetchLatestHouseViewRating } from './research-library'
import { fetchCachedConsensusView } from './consensus-view'
import { classifyRating, type RatingLean } from './rating-scale'
import type { HouseView } from '../../domain/types/security-master'

export type ConvictionSource = {
  source: 'Ord Minnett' | 'Barrenjoey' | 'Consensus'
  rating: string
  lean: RatingLean
}

export type ConvictionRating = {
  /** Null when none of the three sources have any data for this ticker yet. */
  houseView: HouseView | null
  /** 1 (strong sell lean) to 5 (strong buy lean), null if no data. */
  convictionScore: number | null
  sources: ConvictionSource[]
}

const NO_DATA: ConvictionRating = { houseView: null, convictionScore: null, sources: [] }

/**
 * Combines whatever's available from Ord Minnett's house view, Barrenjoey's
 * house view, and the (cached) consensus view into one conviction rating,
 * on the same houseView/convictionScore scale Security Master already
 * uses. Simple and transparent by design: each available source is
 * classified bullish/neutral/bearish, averaged, and mapped to the scale -
 * no opaque weighting. A source contributes nothing if it has no rating on
 * file for this ticker yet, rather than being treated as neutral.
 */
export async function computeConvictionRating(code: string): Promise<ConvictionRating> {
  const [ordMinnett, barrenjoey, consensus] = await Promise.all([
    fetchLatestHouseViewRating(code, 'Ord Minnett'),
    fetchLatestHouseViewRating(code, 'Barrenjoey'),
    fetchCachedConsensusView(code),
  ])

  const sources: ConvictionSource[] = []
  if (ordMinnett) sources.push({ source: 'Ord Minnett', rating: ordMinnett, lean: classifyRating(ordMinnett) })
  if (barrenjoey) sources.push({ source: 'Barrenjoey', rating: barrenjoey, lean: classifyRating(barrenjoey) })
  if (consensus?.consensusRating) {
    sources.push({
      source: 'Consensus',
      rating: consensus.consensusRating,
      lean: classifyRating(consensus.consensusRating),
    })
  }

  if (sources.length === 0) return NO_DATA

  const leanScore = (lean: RatingLean) => (lean === 'bullish' ? 1 : lean === 'bearish' ? -1 : 0)
  const avg = sources.reduce((sum, s) => sum + leanScore(s.lean), 0) / sources.length

  let houseView: HouseView
  if (avg >= 0.67) houseView = 'strong-positive'
  else if (avg >= 0.2) houseView = 'positive'
  else if (avg <= -0.67) houseView = 'strong-negative'
  else if (avg <= -0.2) houseView = 'negative'
  else houseView = 'neutral'

  // Maps the -1..+1 average lean onto a 1-5 scale, 3 being dead neutral.
  const convictionScore = Math.round(((avg + 1) / 2) * 4) + 1

  return { houseView, convictionScore, sources }
}

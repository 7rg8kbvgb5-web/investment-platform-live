export type RatingLean = 'bullish' | 'neutral' | 'bearish'

/**
 * Classifies a free-text rating (whatever label the source itself uses -
 * "Buy", "Overweight", "Accumulate", "Outperform", "Add", etc. on the
 * bullish side; "Sell", "Underweight", "Reduce", "Underperform", "Avoid"
 * on the bearish side) into a simple three-way lean. Anything not
 * recognised (including "Hold"/"Neutral"/"Market Weight") falls to
 * neutral rather than guessing.
 */
export function classifyRating(rating: string): RatingLean {
  const r = rating.toLowerCase()
  if (/\b(buy|overweight|accumulate|outperform|add|strong buy)\b/.test(r)) return 'bullish'
  if (/\b(sell|underweight|reduce|underperform|avoid|strong sell)\b/.test(r)) return 'bearish'
  return 'neutral'
}

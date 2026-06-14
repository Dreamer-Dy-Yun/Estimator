export {
  buildSecondaryDailyTrend,
  buildSecondaryDailyTrendSource,
  dailyMeanSigma,
  forecastDailyMeanFromModel,
} from './secondaryDailyTrendBuilders'

export const zFromSafetyStockConfidencePct: (p: number) => number = (p: number): number => {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

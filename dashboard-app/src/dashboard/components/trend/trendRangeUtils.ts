export type TrendPoint = {
  date: string
  isForecast: boolean
}

export const normalizeMonthKey = (value: string) => {
  const s = value.trim().replace(/\//g, '-').replace(/\./g, '-')
  const m = s.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  return s.slice(0, 7)
}

const findSeriesMonthIndex = (
  series: Array<{ date: string }>,
  monthKey: string,
  kind: 'start' | 'end',
) => {
  if (series.length === 0) return 0
  const exactStart = series.findIndex((p) => p.date === monthKey)
  if (exactStart !== -1) {
    if (kind === 'start') return exactStart
    for (let i = series.length - 1; i >= 0; i -= 1) {
      if (series[i]!.date === monthKey) return i
    }
  }
  const keys = series.map((p) => p.date)
  if (kind === 'start') {
    const i = keys.findIndex((k) => k >= monthKey)
    return i === -1 ? series.length - 1 : i
  }
  let last = -1
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] <= monthKey) last = i
  }
  return last === -1 ? 0 : last
}

export const buildShadeRanges = (
  series: TrendPoint[],
  startMonth: string,
  endMonth: string,
) => {
  let periodStartIdx = findSeriesMonthIndex(series, startMonth, 'start')
  let periodEndIdx = findSeriesMonthIndex(series, endMonth, 'end')
  if (periodEndIdx < periodStartIdx) {
    const t = periodStartIdx
    periodStartIdx = periodEndIdx
    periodEndIdx = t
  }

  const maxIdx = Math.max(0, series.length - 1)
  const periodShade = {
    x1: periodStartIdx - 0.5,
    x2: periodEndIdx + 0.5,
  }

  const forecastStart = periodEndIdx + 0.5
  const forecastShade =
    forecastStart > maxIdx + 0.5
      ? null
      : { x1: forecastStart, x2: maxIdx + 0.5 }

  return { periodStartIdx, periodEndIdx, periodShade, forecastShade }
}

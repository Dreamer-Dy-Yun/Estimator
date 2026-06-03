export type TrendPoint = {
  date: string
  isForecast: boolean
}

export const normalizeMonthKey: (value: string) => string = (value: string) : string => {
  const s: string = value.trim().replace(/\//g, '-').replace(/\./g, '-')
  const m: RegExpMatchArray | null = s.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  return s.slice(0, 7)
}

const findSeriesMonthIndex: (series: Array<{ date: string; }>, monthKey: string, kind: 'start' | 'end') => number = (
  series: Array<{ date: string }>,
  monthKey: string,
  kind: 'start' | 'end',
) : number => {
  if (series.length === 0) return 0
  const exactStart: number = series.findIndex((p: { date: string; }) : boolean => p.date === monthKey)
  if (exactStart !== -1) {
    if (kind === 'start') return exactStart
    for (let i: number = series.length - 1; i >= 0; i -= 1) {
      if (series[i]!.date === monthKey) return i
    }
  }
  const keys: string[] = series.map((p: { date: string; }) : string => p.date)
  if (kind === 'start') {
    const i: number = keys.findIndex((k: string) : boolean => k >= monthKey)
    return i === -1 ? series.length - 1 : i
  }
  let last: number = -1
  for (let i: number = 0; i < keys.length; i += 1) {
    if (keys[i] <= monthKey) last = i
  }
  return last === -1 ? 0 : last
}

export const buildShadeRanges: (series: TrendPoint[], startMonth: string, endMonth: string) => { periodStartIdx: number; periodEndIdx: number; periodShade: { x1: number; x2: number; }; forecastShade: { x1: number; x2: number; } | null; } = (
  series: TrendPoint[],
  startMonth: string,
  endMonth: string,
) : { periodStartIdx: number; periodEndIdx: number; periodShade: { x1: number; x2: number; }; forecastShade: { x1: number; x2: number; } | null; } => {
  let periodStartIdx: number = findSeriesMonthIndex(series, startMonth, 'start')
  let periodEndIdx: number = findSeriesMonthIndex(series, endMonth, 'end')
  if (periodEndIdx < periodStartIdx) {
    const t: number = periodStartIdx
    periodStartIdx = periodEndIdx
    periodEndIdx = t
  }

  const maxIdx: number = Math.max(0, series.length - 1)
  const periodShade: { x1: number; x2: number; } = {
    x1: periodStartIdx - 0.5,
    x2: periodEndIdx + 0.5,
  }

  const forecastStart: number = periodEndIdx + 0.5
  const forecastShade: { x1: number; x2: number; } | null =
    forecastStart > maxIdx + 0.5
      ? null
      : { x1: forecastStart, x2: maxIdx + 0.5 }

  return { periodStartIdx, periodEndIdx, periodShade, forecastShade }
}

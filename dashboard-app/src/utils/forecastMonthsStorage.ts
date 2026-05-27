const STORAGE_KEY = 'han.dashboard.salesTrendForecastMonths'
export const DEFAULT_FORECAST_MONTHS = 12
export const MIN_FORECAST_MONTHS = 1
export const MAX_FORECAST_MONTHS = 12

export function clampForecastMonths(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FORECAST_MONTHS
  return Math.max(MIN_FORECAST_MONTHS, Math.min(MAX_FORECAST_MONTHS, Math.round(n)))
}

/** 브라우저에 저장된 판매추이(월간) 포캐스트 개월 수. 없거나 잘못되면 기본 12. */
export function readForecastMonthsFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT_FORECAST_MONTHS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return DEFAULT_FORECAST_MONTHS
    return clampForecastMonths(Number.parseInt(raw, 10))
  } catch {
    return DEFAULT_FORECAST_MONTHS
  }
}

export function writeForecastMonthsToStorage(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampForecastMonths(n)))
  } catch {
    /* quota / private mode */
  }
}

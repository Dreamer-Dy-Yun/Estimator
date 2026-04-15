const STORAGE_KEY = 'han.dashboard.salesTrendForecastMonths'
const DEFAULT = 8
const MIN = 1
const MAX = 24

export function clampForecastMonths(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT
  return Math.max(MIN, Math.min(MAX, Math.round(n)))
}

/** 브라우저에 저장된 판매추이(월간) 포캐스트 개월 수. 없거나 잘못되면 기본 8. */
export function readForecastMonthsFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return DEFAULT
    return clampForecastMonths(Number.parseInt(raw, 10))
  } catch {
    return DEFAULT
  }
}

export function writeForecastMonthsToStorage(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clampForecastMonths(n)))
  } catch {
    /* quota / private mode */
  }
}

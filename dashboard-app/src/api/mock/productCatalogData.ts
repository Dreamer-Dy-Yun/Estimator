export const SALES_MONTHS: string[] = (() : string[] => {
  const months: string[] = []
  for (let y: number = 2024; y <= 2026; y += 1) {
    for (let m: number = 1; m <= 12; m += 1) {
      if (y === 2024 && m < 7) continue
      if (y === 2026 && m > 6) continue
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }
  return months
})()

export const FORECAST_START_MONTH = '2026-01' as const
export const KREAM_TO_SELF_QTY_RATIO = 10 as const

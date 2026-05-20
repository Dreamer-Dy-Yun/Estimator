export const SALES_MONTHS: string[] = (() => {
  const months: string[] = []
  for (let y = 2024; y <= 2026; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      if (y === 2024 && m < 7) continue
      if (y === 2026 && m > 6) continue
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }
  return months
})()

export const FORECAST_START_MONTH = '2026-01'
export const KREAM_TO_SELF_QTY_RATIO = 10

/**
 * Estimator output-like 1-12 month ratio seed templates.
 * Each SKU applies deterministic jitter before normalization.
 */
export const SEASONALITY_TEMPLATES: ReadonlyArray<readonly number[]> = [
  [0.63, 0.13, 0.025, 0, 0.007, 0.0035, 0.0035, 0.011, 0.007, 0.025, 0.21, 0.47],
  [0.02, 0.02, 0.04, 0.06, 0.08, 0.14, 0.22, 0.2, 0.12, 0.06, 0.03, 0.02],
  [0.05, 0.06, 0.14, 0.22, 0.18, 0.1, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06],
  [0.07, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06, 0.08, 0.14, 0.18, 0.16, 0.12],
  [0.12, 0.1, 0.11, 0.09, 0.06, 0.04, 0.03, 0.04, 0.08, 0.1, 0.12, 0.14],
  [0.18, 0.08, 0.12, 0.1, 0.05, 0.03, 0.02, 0.02, 0.05, 0.07, 0.14, 0.19],
  [0.075, 0.075, 0.08, 0.085, 0.09, 0.095, 0.11, 0.1, 0.085, 0.08, 0.075, 0.075],
  [0.22, 0.15, 0.04, 0.02, 0.03, 0.05, 0.08, 0.18, 0.12, 0.06, 0.03, 0.05],
]

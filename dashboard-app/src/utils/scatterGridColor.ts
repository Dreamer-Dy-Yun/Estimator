const SCATTER_GRID_COLOR_STOPS = ['#ccfbf1', '#bef264', '#fde047', '#f59e0b'] as const

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

function interpolateRgb(from: string, to: string, ratio: number): string {
  const [fr, fg, fb] = hexToRgb(from)
  const [tr, tg, tb] = hexToRgb(to)
  return rgbToHex([
    fr + (tr - fr) * ratio,
    fg + (tg - fg) * ratio,
    fb + (tb - fb) * ratio,
  ])
}

export function getScatterGridCellColor(count: number, maxCount: number): string {
  if (!Number.isFinite(count) || !Number.isFinite(maxCount) || count <= 1 || maxCount <= 1) {
    return SCATTER_GRID_COLOR_STOPS[0]
  }

  const ratio = clampRatio(Math.sqrt((count - 1) / (maxCount - 1)))
  const scaled = ratio * (SCATTER_GRID_COLOR_STOPS.length - 1)
  const fromIndex = Math.floor(scaled)
  const toIndex = Math.min(SCATTER_GRID_COLOR_STOPS.length - 1, fromIndex + 1)
  const localRatio = scaled - fromIndex
  return interpolateRgb(
    SCATTER_GRID_COLOR_STOPS[fromIndex],
    SCATTER_GRID_COLOR_STOPS[toIndex],
    localRatio,
  )
}

export type DisplayNumberRoundingMode = 'round' | 'floor' | 'ceil' | 'trunc'

const FALLBACK_TEXT = '-' as const
const KOREAN_COMPACT_UNITS: readonly { readonly value: number; readonly label: string }[] = [
  { value: 1_000_000_000_000, label: '조' },
  { value: 100_000_000, label: '억' },
  { value: 10_000, label: '만' },
] as const

export type CompactKoreanNumberDisplay = {
  text: string
  fullText: string
  compacted: boolean
  approximate: boolean
}

export type CompactKoreanNumberOptions = {
  compactAt?: number
  maximumFractionDigits?: number
  suffix?: string
  fallback?: string
}

export class DisplayNumberFormatter {
  private readonly locale: string

  constructor(locale: string = 'ko-KR') {
    this.locale = locale
  }

  normalize(value: number, digit: number, mode: DisplayNumberRoundingMode = 'round'): number {
    const factor: number = 10 ** digit
    const scaled: number = value / factor
    const rounded: number = this.applyRounding(scaled, mode) * factor
    const fractionDigits: number = Math.max(0, -digit)
    return fractionDigits === 0 ? rounded : Number(rounded.toFixed(fractionDigits))
  }

  format(
    value: number | null | undefined,
    digit: number = 0,
    mode: DisplayNumberRoundingMode = 'round',
    fallback: string = FALLBACK_TEXT,
  ): string {
    if (value == null || !Number.isFinite(value)) return fallback
    const normalized: number = this.normalize(value, digit, mode)
    const fractionDigits: number = Math.max(0, -digit)
    return normalized.toLocaleString(this.locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
  }

  money(value: number | null | undefined, fallback: string = FALLBACK_TEXT): string {
    return this.format(value, 0, 'round', fallback)
  }

  percent(value: number | null | undefined, fallback: string = FALLBACK_TEXT): string {
    const formatted: string = this.format(value, -1, 'round', fallback)
    return formatted === fallback ? fallback : `${formatted}%`
  }

  private applyRounding(value: number, mode: DisplayNumberRoundingMode): number {
    switch (mode) {
      case 'floor':
        return Math.floor(value)
      case 'ceil':
        return Math.ceil(value)
      case 'trunc':
        return Math.trunc(value)
      case 'round':
        return Math.round(value)
    }
  }
}

export const displayNumber: DisplayNumberFormatter = new DisplayNumberFormatter()

export function formatGroupedNumber(value: number | null): string {
  return displayNumber.format(value, 0, 'round')
}

export function formatGroupedOneDecimal(value: number | null): string {
  return displayNumber.format(value, -1, 'round')
}

export function formatPercent(value: number): string {
  return displayNumber.percent(value)
}

export function formatRatioDecimalKo(value: number): string {
  return displayNumber.format(value, -1, 'round')
}

export function formatEaQuantity(value: number | null): string {
  return value == null ? FALLBACK_TEXT : `${formatGroupedNumber(value)} EA`
}

function getCompactFractionDigits(value: number, maximumFractionDigits: number): number {
  if (value >= 1000) return 0
  if (value >= 10) return Math.min(1, maximumFractionDigits)
  return maximumFractionDigits
}

function formatCompactScaledNumber(value: number, fractionDigits: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}

export function formatCompactKoreanNumber(
  value: number | null | undefined,
  options: CompactKoreanNumberOptions = {},
): CompactKoreanNumberDisplay {
  const fallback: string = options.fallback ?? FALLBACK_TEXT
  if (value == null || !Number.isFinite(value)) {
    return {
      text: fallback,
      fullText: fallback,
      compacted: false,
      approximate: false,
    }
  }

  const suffix: string = options.suffix ?? ''
  const fullText: string = `${formatGroupedNumber(value)}${suffix}`
  const compactAt: number = options.compactAt ?? 10_000
  const maximumFractionDigits: number = options.maximumFractionDigits ?? 2
  const absoluteValue: number = Math.abs(value)
  if (absoluteValue < compactAt) {
    return {
      text: fullText,
      fullText,
      compacted: false,
      approximate: false,
    }
  }

  const unit: { readonly value: number; readonly label: string } | undefined = KOREAN_COMPACT_UNITS.find(
    (candidate: { readonly value: number; readonly label: string }) : boolean => absoluteValue >= candidate.value,
  )
  if (unit == null) {
    return {
      text: fullText,
      fullText,
      compacted: false,
      approximate: false,
    }
  }

  const scaledValue: number = value / unit.value
  const fractionDigits: number = getCompactFractionDigits(Math.abs(scaledValue), maximumFractionDigits)
  return {
    text: `${formatCompactScaledNumber(scaledValue, fractionDigits)}${unit.label}${suffix}`,
    fullText,
    compacted: true,
    approximate: true,
  }
}

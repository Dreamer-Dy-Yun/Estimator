export type DisplayNumberRoundingMode = 'round' | 'floor' | 'ceil' | 'trunc'

const FALLBACK_TEXT = '-' as const

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

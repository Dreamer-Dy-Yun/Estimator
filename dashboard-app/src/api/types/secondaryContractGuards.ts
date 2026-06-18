import type { SecondaryProductIdentity } from './secondary'

export function parseSecondaryIsoDateMs(value: string, field: string, messagePrefix: string): number {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`${messagePrefix}: ${field}`)

  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) {
    throw new Error(`${messagePrefix}: ${field}`)
  }
  return parsed.getTime()
}

export function formatSecondaryIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

export function requireFiniteSecondaryQuantity(value: number | undefined, field: string, messagePrefix: string): number {
  if (value == null || !Number.isFinite(value)) {
    throw new Error(`${messagePrefix}: ${field}`)
  }
  return value
}

export function assertSecondaryProductIdentityMatches(
  context: string,
  expected: SecondaryProductIdentity,
  actual: SecondaryProductIdentity | null | undefined,
): void {
  if (actual == null || typeof actual !== 'object') throw new Error(`${context} productIdentity is required.`)
  if (actual.skuGroupKey !== expected.skuGroupKey) throw new Error(`${context} skuGroupKey mismatch: expected ${expected.skuGroupKey}, got ${actual.skuGroupKey}.`)
  if ((actual.productUuid ?? null) !== (expected.productUuid ?? null)) throw new Error(`${context} productUuid mismatch.`)
  if (actual.brand !== expected.brand) throw new Error(`${context} brand mismatch: expected ${expected.brand}, got ${actual.brand}.`)
  if (actual.code !== expected.code) throw new Error(`${context} code mismatch: expected ${expected.code}, got ${actual.code}.`)
  if (actual.colorCode !== expected.colorCode) throw new Error(`${context} colorCode mismatch: expected ${expected.colorCode}, got ${actual.colorCode}.`)
}

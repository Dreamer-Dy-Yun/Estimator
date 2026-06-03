import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clampForecastMonths,
  readForecastMonthsFromStorage,
  writeForecastMonthsToStorage,
} from './forecastMonthsStorage'

describe('forecastMonthsStorage', () : void => {
  const storageKey = 'han.dashboard.salesTrendForecastMonths.v2' as const
  const legacyStorageKey = 'han.dashboard.salesTrendForecastMonths' as const

  afterEach(() : void => {
    vi.unstubAllGlobals()
  })

  it('clamps forecast months into 1..12 and rounds', () : void => {
    expect(clampForecastMonths(1)).toBe(1)
    expect(clampForecastMonths(12)).toBe(12)
    expect(clampForecastMonths(12.6)).toBe(12)
    expect(clampForecastMonths(0)).toBe(1)
    expect(clampForecastMonths(-10)).toBe(1)
    expect(clampForecastMonths(999)).toBe(12)
    expect(clampForecastMonths(Number.NaN)).toBe(12)
  })

  it('returns default when window is undefined', () : void => {
    vi.stubGlobal('window', undefined)
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('reads and clamps value from localStorage when available', () : void => {
    const store: Map<string, string> = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) : string | null => store.get(k) ?? null,
      setItem: (k: string, v: string) : void => {
        store.set(k, v)
      },
    })
    store.set(storageKey, '25')
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('returns default for non-numeric or empty storage value', () : void => {
    const store: Map<string, string> = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) : string | null => store.get(k) ?? null,
      setItem: (k: string, v: string) : void => {
        store.set(k, v)
      },
    })
    store.set(storageKey, 'abc')
    expect(readForecastMonthsFromStorage()).toBe(12)
    store.set(storageKey, '')
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('parses integer prefix from decimal-like value', () : void => {
    const store: Map<string, string> = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) : string | null => store.get(k) ?? null,
      setItem: (k: string, v: string) : void => {
        store.set(k, v)
      },
    })
    store.set(storageKey, '12.7')
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('ignores legacy stored values so the initial monthly forecast stays 12', () : void => {
    const store: Map<string, string> = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) : string | null => store.get(k) ?? null,
      setItem: (k: string, v: string) : void => {
        store.set(k, v)
      },
    })
    store.set(legacyStorageKey, '8')
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('returns default when localStorage read throws', () : void => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: () : never => {
        throw new Error('blocked')
      },
      setItem: () : undefined => undefined,
    })
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('writes clamped value and ignores write exceptions', () : void => {
    const written: Array<[string, string]> = []
    vi.stubGlobal('localStorage', {
      getItem: () : null => null,
      setItem: (k: string, v: string) : void => {
        written.push([k, v])
      },
    })
    writeForecastMonthsToStorage(25.2)
    expect(written).toEqual([[storageKey, '12']])

    vi.stubGlobal('localStorage', {
      getItem: () : null => null,
      setItem: () : never => {
        throw new Error('quota')
      },
    })
    expect(() : void => writeForecastMonthsToStorage(5)).not.toThrow()
  })
})

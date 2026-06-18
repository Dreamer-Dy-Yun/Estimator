// @vitest-environment jsdom
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryDailyTrendParams, SecondaryDailyTrendSource } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { dashboardApi } from '../../../../../api'
import { useSecondaryDailyTrend, type Params } from './useSecondaryDailyTrend'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-1' }
const COMPARISON: ProductComparisonTarget = { id: 'self', label: 'Self', role: 'comparison', kind: 'self-company', sourceId: 'company-1' }

function makeApiErrorInfo(request: string, err: unknown): ApiUnitErrorInfo {
  return {
    checkedAt: '2026-06-16T00:00:00.000Z',
    page: 'test',
    request,
    error: err instanceof Error ? err.message : String(err),
  }
}

function makeSource(overrides: Partial<SecondaryDailyTrendSource> = {}): SecondaryDailyTrendSource {
  return {
    productId: 'sku-a',
    dateStart: '2026-06-01',
    dateEnd: '2026-06-15',
    forecastStartDate: '2026-06-16',
    baseStockAtStart: 10,
    comparisonStockAtStart: null,
    flowByDate: {},
    ...overrides,
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ props, onRender }: { props: Params; onRender: (result: ReturnType<typeof useSecondaryDailyTrend>) => void }): null {
  const result: ReturnType<typeof useSecondaryDailyTrend> = useSecondaryDailyTrend(props)
  onRender(result)
  return null
}

function renderHook(initialProps: Params): { readonly current: ReturnType<typeof useSecondaryDailyTrend> } {
  const state: { current: ReturnType<typeof useSecondaryDailyTrend> | null } = { current: null }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<Probe props={initialProps} onRender={(result: ReturnType<typeof useSecondaryDailyTrend>): void => {
      state.current = result
    }} />)
  })
  return {
    get current(): ReturnType<typeof useSecondaryDailyTrend> {
      if (state.current == null) throw new Error('hook result is not rendered')
      return state.current
    },
  }
}

async function flushMicrotasks(): Promise<void> {
  await act(async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSecondaryDailyTrend', (): void => {
  it('surfaces response identity mismatches as daily trend errors', async (): Promise<void> => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 16))
    const request: Mock<(params: SecondaryDailyTrendParams) => Promise<SecondaryDailyTrendSource>> = vi
      .spyOn(dashboardApi, 'getSecondaryDailyTrend')
      .mockResolvedValue(makeSource({ productId: 'other-sku' }))

    const hook: { readonly current: ReturnType<typeof useSecondaryDailyTrend> } = renderHook({
      skuGroupKey: 'sku-a',
      selectedStart: '2026-06',
      selectedEnd: '2026-06',
      baseSubject: BASE_SUBJECT,
      comparisonTarget: COMPARISON,
      orderCoverageDays: 0,
      makeApiErrorInfo,
    })
    await flushMicrotasks()

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      skuGroupKey: 'sku-a',
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      forecastDays: 0,
    }))
    expect(hook.current.dailyTrendSeries).toEqual([])
    expect(hook.current.dailyTrendError?.error).toContain('productId mismatch')
  })
})

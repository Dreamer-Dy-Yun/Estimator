// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi, type SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

const BASE_PROPS = {
  skuGroupKey: 'sku-a',
  selectedStart: '2025-01',
  selectedEnd: '2025-12',
  forecastMeanPeriodEnd: '2026-08',
  leadTimeDays: 30,
  makeApiErrorInfo: (request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: '2026-05-19T00:00:00.000Z',
    page: 'test',
    request,
    error: err instanceof Error ? err.message : String(err),
  }),
}

function calcResult(dailyMean: number): SecondaryStockOrderCalcResult {
  return {
    trendDailyMean: dailyMean,
    dailyMean,
    sigma: 1,
    display: {
      currentStockQtyTotal: 1,
      totalOrderBalanceTotal: 2,
      expectedInboundOrderBalanceTotal: 3,
      currentStockQtyBySize: [1],
      totalOrderBalanceBySize: [2],
      expectedInboundOrderBalanceBySize: [3],
    },
    safetyStockCalc: {
      safetyStock: 4,
      recommendedOrderQty: 5,
      expectedOrderAmount: 6,
      expectedSalesAmount: 7,
      expectedOpProfit: 8,
    },
    forecastQtyCalc: {
      safetyStock: null,
      recommendedOrderQty: 9,
      expectedOrderAmount: 10,
      expectedSalesAmount: 11,
      expectedOpProfit: 12,
    },
  }
}

function Probe({ dailyMeanClient }: { dailyMeanClient: number | null }) {
  const state = useSecondaryStockOrderCalc({
    ...BASE_PROPS,
    dailyMeanClient,
  })
  return (
    <output data-loading={state.forecastCalcLoading}>
      {state.forecastCalc?.dailyMean ?? ''}
    </output>
  )
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderProbe(dailyMeanClient: number | null) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(<Probe dailyMeanClient={dailyMeanClient} />)
  })
}

function rerenderProbe(dailyMeanClient: number | null) {
  act(() => {
    root?.render(<Probe dailyMeanClient={dailyMeanClient} />)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSecondaryStockOrderCalc', () => {
  it('waits for the final input before requesting stock order calculation', async () => {
    vi.useFakeTimers()
    const request = vi
      .spyOn(dashboardApi, 'getSecondaryStockOrderCalc')
      .mockResolvedValue(calcResult(20))

    renderProbe(10)

    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    expect(request).not.toHaveBeenCalled()

    rerenderProbe(20)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ dailyMean: 20 }))
  })
})

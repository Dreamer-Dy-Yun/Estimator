import type { ProductComparisonBaseSubjectRef, SecondaryProductIdentity, SecondaryStockOrderCalcParams } from '../../../../../api/types'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import { dashboardApi, type SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-1' }
const PRODUCT_IDENTITY: SecondaryProductIdentity = { productUuid: null, skuGroupKey: 'sku-a', brand: 'Brand', code: 'CODE', colorCode: 'BLK' }

const BASE_PROPS: { skuGroupKey: string; productIdentity: SecondaryProductIdentity; periodStart: string; periodEnd: string; baseSubject: ProductComparisonBaseSubjectRef; calculationBaseDate: string; currentOrderInboundDueDate: string; forecastPeriodEndMonth: string; orderCoverageDays: number; makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo; } = {
  skuGroupKey: 'sku-a',
  productIdentity: PRODUCT_IDENTITY,
  periodStart: '2025-01-01',
  periodEnd: '2025-12-31',
  baseSubject: BASE_SUBJECT,
  calculationBaseDate: '2026-01-01',
  currentOrderInboundDueDate: '2026-02-01',
  forecastPeriodEndMonth: '2026-08',
  orderCoverageDays: 30,
  makeApiErrorInfo: (request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: '2026-05-19T00:00:00.000Z',
    page: 'test',
    request,
    error: err instanceof Error ? err.message : String(err),
  }),
}

function calcResult(dailyMean: number): SecondaryStockOrderCalcResult {
  return {
    productIdentity: PRODUCT_IDENTITY,
    existingOrderInboundSupplyBySize: {
      S: [
        { date: '2026-01-15', qty: 2 },
        { date: '2026-02-01', qty: 1 },
      ],
    },
    trendDailyMean: dailyMean,
    dailyMean,
    sigma: 1,
    display: {
      currentStockQtyTotal: 1,
      totalOrderBalanceTotal: 3,
      expectedInboundOrderBalanceTotal: 2,
      sizeRows: [{
        size: 'S',
        currentStockQty: 1,
        totalOrderBalance: 3,
        expectedInboundOrderBalance: 2,
      }],
    },
  }
}

function Probe({ dailyMeanClient }: { dailyMeanClient: number | null }) : React.JSX.Element {
  const state: { forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; } = useSecondaryStockOrderCalc({
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

function renderProbe(dailyMeanClient: number | null) : void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe dailyMeanClient={dailyMeanClient} />)
  })
}

function rerenderProbe(dailyMeanClient: number | null) : void {
  act(() : void => {
    root?.render(<Probe dailyMeanClient={dailyMeanClient} />)
  })
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSecondaryStockOrderCalc', () : void => {
  it('waits for the final input before requesting stock order calculation', async () : Promise<void> => {
    vi.useFakeTimers()
    const request: Mock<(params: SecondaryStockOrderCalcParams) => Promise<SecondaryStockOrderCalcResult>> = vi
      .spyOn(dashboardApi, 'getSecondaryStockOrderCalc')
      .mockResolvedValue(calcResult(20))

    renderProbe(10)

    await act(async () : Promise<void> => {
      vi.advanceTimersByTime(900)
    })
    expect(request).not.toHaveBeenCalled()

    rerenderProbe(20)

    await act(async () : Promise<void> => {
      vi.advanceTimersByTime(1000)
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ dailyMean: 20 }))
  })
})

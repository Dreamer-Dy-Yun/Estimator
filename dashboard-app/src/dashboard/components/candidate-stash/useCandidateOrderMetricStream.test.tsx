// @vitest-environment jsdom
import { act, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
} from '../../../api'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'

const TEST_COMPANY_UUID = '00000000-0000-4000-8000-000000000101'

const apiMock = vi.hoisted(() => ({
  subscribeCandidateOrderMetrics: vi.fn(),
  subscriptions: [] as {
    params: CandidateOrderMetricStreamParams
    listener: (event: CandidateOrderMetricEvent) => void
    close: ReturnType<typeof vi.fn>
  }[],
}))

vi.mock('../../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api')>()
  return {
    ...actual,
    subscribeCandidateOrderMetrics: apiMock.subscribeCandidateOrderMetrics,
  }
})

const BASE_INSIGHT = {
  competitorChannelLabel: '크림',
  competitorQty: null,
  competitorAmount: null,
  selfQty: null,
  selfAmount: null,
  expectedSalesQty: 0,
  expectedSalesAmount: 0,
  expectedOpProfit: 0,
  selfOpProfitRatePct: null,
  rankTone: 'neutral' as const,
  topPercentThreshold: 10,
  bottomPercentThreshold: 10,
  badges: [],
}

function candidateItem(uuid: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `${uuid}-sku`,
    skuGroupKey: `${uuid}-group`,
    brand: '브랜드',
    code: 'CODE',
    productName: '상품',
    colorCode: '010',
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loading',
    insight: BASE_INSIGHT,
    isLatestLlmComment: false,
    isDetailConfirmed: false,
    orderExport: null,
    dbCreatedAt: '2026-05-19T00:00:00.000Z',
    dbUpdatedAt: '2026-05-19T00:00:00.000Z',
  }
}

function metric(itemUuid: string): CandidateOrderMetric {
  return {
    itemUuid,
    skuUuid: `${itemUuid}-sku`,
    qty: 10,
    expectedOrderAmount: 1000,
    expectedSalesAmount: 1500,
    expectedOpProfit: 200,
    orderExport: {
      competitorChannelLabel: '크림',
      selfQty: null,
      competitorQty: null,
      expectedSalesQty: 10,
      expectedOrderAmount: 1000,
      avgCost: null,
      avgPrice: null,
      feeRatePct: null,
      opMarginRatePct: null,
      inboundExpectedDate: null,
      sizeOrderQty: [],
    },
  }
}

type Controls = ReturnType<typeof useCandidateOrderMetricStream>

let root: Root | null = null
let container: HTMLDivElement | null = null
let controls: Controls | null = null

function Probe({ onControls }: { onControls: (nextControls: Controls) => void }) {
  const mountedRef = useRef(true)
  const [, setItems] = useState<CandidateItemSummary[]>([
    candidateItem('item-1'),
    candidateItem('item-2'),
  ])
  const nextControls = useCandidateOrderMetricStream({
    stashUuid: 'stash-1',
    companyUuid: TEST_COMPANY_UUID,
    mountedRef,
    setItems,
  })
  useEffect(() => {
    onControls(nextControls)
  }, [nextControls, onControls])
  useEffect(() => () => {
    mountedRef.current = false
  }, [])
  return <output />
}

function renderProbe() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(<Probe onControls={(nextControls) => {
      controls = nextControls
    }} />)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  controls = null
  apiMock.subscribeCandidateOrderMetrics.mockReset()
  apiMock.subscriptions = []
})

describe('useCandidateOrderMetricStream', () => {
  it('does not reopen an identical pending stream and closes after every item settles', () => {
    apiMock.subscribeCandidateOrderMetrics.mockImplementation((params, listener) => {
      const close = vi.fn()
      apiMock.subscriptions.push({ params, listener, close })
      return { close }
    })
    renderProbe()

    let seq = 0
    act(() => {
      seq = controls?.beginItemLoad() ?? 0
      controls?.subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: '2026-04-01',
        dataReferencePeriodEnd: '2026-05-31',
        candidateItemUuids: ['item-2', 'item-1', 'item-2'],
      })
      controls?.subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: '2026-04-01',
        dataReferencePeriodEnd: '2026-05-31',
        candidateItemUuids: ['item-1', 'item-2'],
      })
    })

    expect(apiMock.subscribeCandidateOrderMetrics).toHaveBeenCalledTimes(1)
    expect(apiMock.subscriptions[0].params.companyUuid).toBe(TEST_COMPANY_UUID)
    expect(apiMock.subscriptions[0].params.candidateItemUuids).toEqual(['item-1', 'item-2'])

    act(() => {
      apiMock.subscriptions[0].listener({
        type: 'item',
        requestId: apiMock.subscriptions[0].params.requestId,
        itemUuid: 'item-1',
        skuUuid: 'item-1-sku',
        metric: metric('item-1'),
      })
    })
    expect(apiMock.subscriptions[0].close).not.toHaveBeenCalled()

    act(() => {
      apiMock.subscriptions[0].listener({
        type: 'item',
        requestId: apiMock.subscriptions[0].params.requestId,
        itemUuid: 'item-2',
        skuUuid: 'item-2-sku',
        metric: metric('item-2'),
      })
    })
    expect(apiMock.subscriptions[0].close).toHaveBeenCalledTimes(1)
  })
})

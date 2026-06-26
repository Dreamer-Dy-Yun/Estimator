// @vitest-environment jsdom
import type { MutableRefObject } from 'react'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CandidateItemDetail, CandidateItemSummary } from '../../../api'
import { validSnapshot } from '../../../snapshot/orderSnapshotTestFixtures'
import type { CandidateDetailConfirmationOverrideMap } from './candidateDetailConfirmationOverrideModel'
import type { CandidateItemStateUpdater } from './candidateStashDetailTypes'
import { useCandidateDetailConfirmationMutations } from './useCandidateDetailConfirmationMutations'

type HookResult = ReturnType<typeof useCandidateDetailConfirmationMutations>

let root: Root | null = null
let container: HTMLDivElement | null = null
let controls: HookResult | null = null

function candidateItemSummary(uuid: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `sku-${uuid}`,
    skuGroupKey: validSnapshot.skuGroupKey,
    brand: 'Brand',
    code: `CODE-${uuid}`,
    productName: `Product ${uuid}`,
    colorCode: 'BLACK',
    thumbnailUrl: null,
    orderMetricStatus: 'loaded',
    qty: 10,
    expectedOrderAmount: 1000,
    expectedSalesAmount: 2000,
    expectedOpProfit: 300,
    insightStatus: 'loaded',
    insight: {
      competitorSalesSourceLabel: 'Cream',
      competitorQty: null,
      competitorAmount: null,
      selfQty: null,
      selfAmount: null,
      expectedSalesQty: 10,
      expectedSalesAmount: 2000,
      expectedOpProfit: 300,
      selfOpProfitRatePct: null,
      rankTone: 'neutral',
      topPercentThreshold: 20,
      bottomPercentThreshold: 20,
      badges: [],
    },
    isLatestLlmComment: true,
    hasConfirmedOrderSnapshot: false,
    orderExport: null,
    dbCreatedAt: '2026-05-01T00:00:00.000Z',
    dbUpdatedAt: '2026-05-01T00:00:00.000Z',
  }
}

function candidateItemDetail(uuid: string, confirmed: boolean): CandidateItemDetail {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `sku-${uuid}`,
    skuGroupKey: validSnapshot.skuGroupKey,
    confirmedOrderSnapshot: confirmed ? validSnapshot : null,
    hasConfirmedOrderSnapshot: confirmed,
    isLatestLlmComment: false,
    dbCreatedAt: '2026-05-01T00:00:00.000Z',
    dbUpdatedAt: '2026-05-02T00:00:00.000Z',
  }
}

function Probe({
  itemsRef,
  confirmationOverridesRef,
  setItems,
  drawer,
  onOrderMetricsInvalidated,
  onRender,
}: Parameters<typeof useCandidateDetailConfirmationMutations>[0] & { onRender: (next: HookResult) => void }) : null {
  const nextControls: HookResult = useCandidateDetailConfirmationMutations({
    itemsRef,
    confirmationOverridesRef,
    setItems,
    drawer,
    onOrderMetricsInvalidated,
  })
  onRender(nextControls)
  return null
}

function renderHookHarness({
  initialItems = [candidateItemSummary('item-1')],
  onOrderMetricsInvalidated = vi.fn(),
}: {
  initialItems?: CandidateItemSummary[]
  onOrderMetricsInvalidated?: (itemUuids: string[]) => void
} = {}): {
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  drawer: {
    markDrawerSnapshotConfirmed: ReturnType<typeof vi.fn>
    markDrawerSnapshotUnconfirmed: ReturnType<typeof vi.fn>
  }
  onOrderMetricsInvalidated: (itemUuids: string[]) => void
} {
  const itemsRef: MutableRefObject<CandidateItemSummary[]> = { current: initialItems }
  const confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap> = { current: {} }
  const drawer = {
    markDrawerSnapshotConfirmed: vi.fn(),
    markDrawerSnapshotUnconfirmed: vi.fn(),
  }
  const setItems = vi.fn((next: CandidateItemStateUpdater): void => {
    itemsRef.current = typeof next === 'function' ? next(itemsRef.current) : next
  })

  act(() : void => {
    root?.render(createElement(Probe, {
      itemsRef,
      confirmationOverridesRef,
      setItems,
      drawer,
      onOrderMetricsInvalidated,
      onRender: (next: HookResult): void => { controls = next },
    }))
  })

  return { itemsRef, drawer, onOrderMetricsInvalidated }
}

beforeEach(() : void => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  controls = null
})

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  container?.remove()
  root = null
  container = null
  controls = null
})

describe('useCandidateDetailConfirmationMutations', () : void => {
  it('invalidates order metrics after drawer confirmation changes', () : void => {
    const { itemsRef, drawer, onOrderMetricsInvalidated } = renderHookHarness()

    act(() : void => {
      controls?.markDrawerSnapshotConfirmed('item-1', validSnapshot, candidateItemDetail('item-1', true))
    })

    expect(itemsRef.current[0]?.hasConfirmedOrderSnapshot).toBe(true)
    expect(drawer.markDrawerSnapshotConfirmed).toHaveBeenCalledWith('item-1', validSnapshot, '2026-05-01T00:00:00.000Z')
    expect(onOrderMetricsInvalidated).toHaveBeenCalledWith(['item-1'])
  })

  it('invalidates order metrics after drawer unconfirmation changes', () : void => {
    const onOrderMetricsInvalidated = vi.fn()
    const { itemsRef, drawer } = renderHookHarness({
      initialItems: [{ ...candidateItemSummary('item-1'), hasConfirmedOrderSnapshot: true }],
      onOrderMetricsInvalidated,
    })

    act(() : void => {
      controls?.markDrawerSnapshotUnconfirmed('item-1', candidateItemDetail('item-1', false))
    })

    expect(itemsRef.current[0]?.hasConfirmedOrderSnapshot).toBe(false)
    expect(drawer.markDrawerSnapshotUnconfirmed).toHaveBeenCalledWith('item-1', '2026-05-01T00:00:00.000Z')
    expect(onOrderMetricsInvalidated).toHaveBeenCalledWith(['item-1'])
  })
})

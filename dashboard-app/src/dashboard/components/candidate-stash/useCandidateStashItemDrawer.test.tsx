import type { CandidateItemDetail } from '../../../api'
import type { InnerCandidateRow } from './candidateStashDetailTypes'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { validSnapshot } from '../../../snapshot/orderSnapshotTestFixtures'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'

const apiMock: { getCandidateItemByUuid: Mock<(...args: unknown[]) => unknown> } = vi.hoisted(() : { getCandidateItemByUuid: Mock<(...args: unknown[]) => unknown> } => ({
  getCandidateItemByUuid: vi.fn(),
}))

vi.mock('../../../api', async (importOriginal: <T = unknown>() => Promise<T>) : Promise<typeof import('../../../api')> => {
  const actual: typeof import('../../../api') = await importOriginal<typeof import('../../../api')>()
  return {
    ...actual,
    getCandidateItemByUuid: apiMock.getCandidateItemByUuid as typeof actual.getCandidateItemByUuid,
    isAllCompanyScope: ((companyUuid: string | null | undefined): boolean => companyUuid === actual.ALL_COMPANY_UUID) as typeof actual.isAllCompanyScope,
  }
})

vi.mock('../../hooks/useProductDrawerBundle', () : { useProductDrawerBundleState: () => { bundle: null; loading: false } } => ({
  useProductDrawerBundleState: () : { bundle: null; loading: false } => ({ bundle: null, loading: false }),
}))

function candidateDetail(): CandidateItemDetail {
  return {
    uuid: 'item-1',
    stashUuid: 'stash-1',
    skuUuid: 'sku-1',
    skuGroupKey: validSnapshot.skuGroupKey,
    confirmedOrderSnapshot: validSnapshot,
    hasConfirmedOrderSnapshot: true,
    isLatestLlmComment: false,
    dbCreatedAt: '2026-06-01T00:00:00.000Z',
    dbUpdatedAt: '2026-06-01T00:00:00.000Z',
  }
}

function candidateRow(): InnerCandidateRow {
  return {
    ...candidateDetail(),
    brand: 'Brand',
    code: 'RUN',
    productName: 'Runner',
    colorCode: 'BLK',
    thumbnailUrl: null,
    orderMetricStatus: 'loaded',
    qty: 12,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loaded',
    insight: {
      competitorSalesSourceLabel: 'Cream',
      competitorQty: null,
      competitorAmount: null,
      selfQty: null,
      selfAmount: null,
      expectedSalesQty: 12,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
      selfOpProfitRatePct: null,
      rankTone: 'neutral',
      topPercentThreshold: 10,
      bottomPercentThreshold: 10,
      badges: [],
    },
    orderExport: null,
  }
}

export type DrawerControls = ReturnType<typeof useCandidateStashItemDrawer>

let root: Root | null = null
let container: HTMLDivElement | null = null
let controls: DrawerControls | null = null

function Probe({ onRender }: { onRender: (next: DrawerControls) => void }) : null {
  const nextControls: DrawerControls = useCandidateStashItemDrawer({
    dataReferenceStart: '2026-01-01',
    dataReferenceEnd: '2026-01-31',
    detailTarget: {
      uuid: 'stash-1',
      name: 'stash',
      note: null,
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      forecastMonths: 8,
      itemCount: 1,
      dbCreatedAt: '2026-06-01T00:00:00.000Z',
      dbUpdatedAt: '2026-06-01T00:00:00.000Z',
    },
    itemDeleteTargetUuid: null,
    tableRows: [candidateRow()],
  })
  onRender(nextControls)
  return null
}

function renderProbe(): DrawerControls {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe onRender={(next: DrawerControls): void => { controls = next }} />)
  })
  if (!controls) throw new Error('Probe did not render controls.')
  return controls
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  controls = null
  apiMock.getCandidateItemByUuid.mockReset()
})

describe('useCandidateStashItemDrawer', () : void => {
  it('does not restore a stale confirmed snapshot after unconfirm clears the drawer state', async () : Promise<void> => {
    apiMock.getCandidateItemByUuid.mockResolvedValue(candidateDetail())
    renderProbe()

    await act(async () : Promise<void> => {
      await controls!.openItemDrawer(candidateRow(), { companyUuid: 'company-uuid-001' })
    })

    expect(controls!.confirmedHydrateSnap?.savedAt).toBe(validSnapshot.savedAt)

    const clearDraftBeforeUnconfirm: (itemUuid: string) => void = controls!.clearDrawerDraftSnapshot

    act(() : void => {
      controls!.markDrawerSnapshotUnconfirmed('item-1', '2026-06-01T00:00:00.000Z')
      clearDraftBeforeUnconfirm('item-1')
    })

    expect(controls!.hydrateSnap).toBeNull()
    expect(controls!.hydrateSnapSource).toBeNull()
    expect(controls!.confirmedHydrateSnap).toBeNull()
  })
})

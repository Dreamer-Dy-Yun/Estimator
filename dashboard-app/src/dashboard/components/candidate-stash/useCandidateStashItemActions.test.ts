// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCandidateItem,
  updateCandidateItem,
  type CandidateItemSummary,
} from '../../../api'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'

vi.mock('../../../api', () => ({
  deleteCandidateItem: vi.fn(),
  deleteCandidateItems: vi.fn(),
  getApiErrorDisplayMessage: vi.fn((error: unknown, fallback: string) => (
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback
  )),
  updateCandidateItem: vi.fn(),
}))

vi.mock('../../../utils/candidateOrderExcelExport', () => ({
  createCandidateOrderExcelExport: vi.fn(),
  downloadBlob: vi.fn(),
}))

type HookArgs = Parameters<typeof useCandidateStashItemActions>[0]
type HookResult = ReturnType<typeof useCandidateStashItemActions>

let root: Root | null = null
let container: HTMLDivElement | null = null

const createCandidateItemSummary = (uuid: string): CandidateItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid: `sku-${uuid}`,
  skuGroupKey: `sku-group-${uuid}`,
  brand: '테스트 브랜드',
  code: `CODE-${uuid}`,
  productName: `상품 ${uuid}`,
  colorCode: 'BLACK',
  orderMetricStatus: 'loaded',
  qty: 0,
  expectedOrderAmount: 0,
  expectedSalesAmount: 0,
  expectedOpProfit: 0,
  insightStatus: 'loaded',
  insight: {
    competitorChannelLabel: '경쟁사',
    competitorQty: null,
    competitorAmount: null,
    selfQty: null,
    selfAmount: null,
    expectedSalesQty: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    selfOpProfitRatePct: null,
    rankTone: 'neutral',
    topPercentThreshold: 20,
    bottomPercentThreshold: 20,
    badges: [],
  },
  isLatestLlmComment: false,
  isDetailConfirmed: false,
  orderExport: null,
  dbCreatedAt: '2026-05-01T00:00:00.000Z',
  dbUpdatedAt: '2026-05-01T00:00:00.000Z',
})

function Probe({ args, onRender }: { args: HookArgs, onRender: (result: HookResult) => void }) {
  onRender(useCandidateStashItemActions(args))
  return null
}

function renderActions(args: HookArgs) {
  let current: HookResult | null = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(createElement(Probe, { args, onRender: (result) => { current = result } }))
  })
  return {
    get current() {
      if (!current) throw new Error('Hook result is not ready')
      return current
    },
  }
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('useCandidateStashItemActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setup = (overrides: Partial<HookArgs> = {}) => {
    const args: HookArgs = {
      stashUuid: 'stash-1',
      companyUuid: 'company-1',
      detailTarget: null,
      items: [],
      itemDeleteTarget: createCandidateItemSummary('item-1'),
      openedItemUuid: null,
      closeDrawer: vi.fn(),
      refreshStashes: vi.fn().mockResolvedValue(undefined),
      showToast: vi.fn(),
      onItemsDeleted: vi.fn(),
      onItemsUnconfirmed: vi.fn(),
      ...overrides,
    }

    const hook = renderActions(args)
    return { args, hook }
  }

  it('does not report delete mutation failure when refresh fails after item deletion', async () => {
    vi.mocked(deleteCandidateItem).mockResolvedValue({} as never)
    const { args, hook } = setup({
      refreshStashes: vi.fn().mockRejectedValue(new Error('refresh failed')),
    })

    await act(async () => {
      await hook.current.confirmDeleteItem()
    })

    expect(args.onItemsDeleted).toHaveBeenCalledWith(['item-1'])
    expect(args.showToast).toHaveBeenCalledWith(
      '후보를 삭제했지만 목록을 새로고침하지 못했습니다.',
      { variant: 'error' },
    )
    expect(vi.mocked(args.showToast).mock.calls.map(([message]) => message)).not.toContain('후보를 삭제했습니다.')
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message.includes('삭제하지 못했습니다'))).toBe(false)
  })

  it('marks partial bulk unconfirm toast as warning', async () => {
    vi.mocked(updateCandidateItem)
      .mockResolvedValueOnce({ uuid: 'item-1' } as never)
      .mockRejectedValueOnce(new Error('update failed'))
    const { args, hook } = setup({ itemDeleteTarget: null })

    await expect(act(async () => {
      await hook.current.confirmUnconfirmItems(['item-1', 'item-2'])
    })).rejects.toThrow('update failed')

    expect(args.refreshStashes).toHaveBeenCalledTimes(1)
    expect(args.showToast).toHaveBeenCalledWith(
      '상세 확정 해제: 1개 성공/1개 실패했습니다.',
      { variant: 'error' },
    )
  })
})

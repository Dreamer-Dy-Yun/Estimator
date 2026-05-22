// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CandidateReferenceItemSummary } from '../../../api'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'

const rows = [
  {
    uuid: 'candidate-1',
    skuGroupKey: 'sku-1',
    brand: '테스트 브랜드',
    code: 'P-001',
    productName: '테스트 상품',
    colorCode: 'BLACK',
    insight: {
      badges: [],
      selfQty: 120,
      selfAmount: 120000,
      selfOpProfitRatePct: 9,
      competitorQty: 80,
      competitorAmount: 80000,
      competitorChannelLabel: '경쟁사',
      expectedSalesQty: 100,
      expectedSalesAmount: 100000,
      expectedOpProfit: 9000,
      rankTone: 'neutral',
      topPercentThreshold: 20,
      bottomPercentThreshold: 20,
    },
  },
] as CandidateReferenceItemSummary[]

type ModalProps = Parameters<typeof CandidateRecommendationModal>[0]

let root: Root | null = null
let container: HTMLDivElement | null = null

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = container?.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

function renderModal(overrides: Partial<ModalProps> = {}) {
  const props: ModalProps = {
    rows,
    loading: false,
    error: null,
    selectedUuids: new Set(['candidate-1']),
    onClose: vi.fn(),
    onToggleAll: vi.fn(),
    onToggleItem: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  }

  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(<CandidateRecommendationModal {...props} />)
  })

  return { props }
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

describe('CandidateRecommendationModal', () => {
  it('focuses the select-all control on open and restores previous focus on close', () => {
    const previousButton = document.createElement('button')
    previousButton.textContent = '이전 포커스'
    document.body.appendChild(previousButton)
    previousButton.focus()

    renderModal()

    expect(document.activeElement).toBe(getRequiredElement<HTMLInputElement>('input[aria-label="추천 전체 선택"]'))

    act(() => {
      root?.unmount()
    })
    root = null

    expect(document.activeElement).toBe(previousButton)
  })

  it('exposes complete table row, header, and cell semantics', () => {
    renderModal()

    const table = getRequiredElement<HTMLDivElement>('[role="table"]')
    const tableRows = Array.from(table.querySelectorAll<HTMLElement>('[role="row"]'))
    const headerCells = Array.from(tableRows[0]?.querySelectorAll<HTMLElement>('[role="columnheader"]') ?? [])
    const dataCells = Array.from(tableRows[1]?.querySelectorAll<HTMLElement>('[role="cell"]') ?? [])

    expect(tableRows).toHaveLength(2)
    expect(headerCells).toHaveLength(7)
    expect(dataCells).toHaveLength(7)
  })

  it('keeps non-data table states inside a spanning cell', () => {
    renderModal({ rows: [], loading: true, selectedUuids: new Set() })

    const statusCell = getRequiredElement<HTMLElement>('[role="row"] [role="cell"][aria-colspan="7"]')

    expect(statusCell.querySelector('[role="status"]')).not.toBeNull()
  })

  it('blocks stale recommendation apply while an error is shown', () => {
    renderModal({ error: 'network down' })

    const applyButton = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    expect(container?.textContent).not.toContain('테스트 상품')
    expect(applyButton.disabled).toBe(true)
    expect(container?.textContent).toContain('추천 후보 조회 실패: network down')
  })

  it('does not enable apply with only stale selections outside visible rows', () => {
    renderModal({
      selectedUuids: new Set(['stale-candidate']),
    })

    const applyButton = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    expect(container?.textContent).toContain('추천 1개 · 선택 0개')
    expect(container?.textContent).toContain('선택 0개')
    expect(applyButton.disabled).toBe(true)
  })

  it('keeps Tab and Shift+Tab focus inside the modal', () => {
    renderModal()

    const closeButton = getRequiredElement<HTMLButtonElement>('button[aria-label="추천 보기 닫기"]')
    const applyButton = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button) => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    closeButton.focus()
    act(() => {
      closeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })
    expect(document.activeElement).toBe(applyButton)

    act(() => {
      applyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(document.activeElement).toBe(closeButton)
  })

  it('closes the modal with Escape', () => {
    const { props } = renderModal()
    const dialog = getRequiredElement<HTMLDivElement>('[role="dialog"]')

    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CandidateReferenceItemSummary } from '../../../api'
import { DRAWER_KEEP_OPEN_SELECTOR } from '../../drawer/drawerDom'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'

const rows: CandidateReferenceItemSummary[] = [
  {
    uuid: 'candidate-1',
    skuGroupKey: 'sku-1',
    brand: '테스트 브랜드',
    code: 'P-001',
    productName: '테스트 상품',
    colorCode: 'BLACK',
    thumbnailUrl: null,
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

export type ModalProps = Parameters<typeof CandidateRecommendationModal>[0]

let root: Root | null = null
let container: HTMLDivElement | null = null

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element: T | null | undefined = container?.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

function renderModal(overrides: Partial<ModalProps> = {}) : { props: ModalProps; } {
  const props: ModalProps = {
    rows,
    loading: false,
    applying: false,
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
  act(() : void => {
    root?.render(<CandidateRecommendationModal {...props} />)
  })

  return { props }
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('CandidateRecommendationModal', () : void => {
  it('focuses the select-all control on open and restores previous focus on close', () : void => {
    const previousButton: HTMLButtonElement = document.createElement('button')
    previousButton.textContent = '이전 포커스'
    document.body.appendChild(previousButton)
    previousButton.focus()

    renderModal()

    expect(document.activeElement).toBe(getRequiredElement<HTMLInputElement>('input[aria-label="추천 전체 선택"]'))

    act(() : void => {
      root?.unmount()
    })
    root = null

    expect(document.activeElement).toBe(previousButton)
  })

  it('exposes complete table row, header, and cell semantics', () : void => {
    renderModal()

    const table: HTMLDivElement = getRequiredElement<HTMLDivElement>('[role="table"]')
    const tableRows: HTMLElement[] = Array.from(table.querySelectorAll<HTMLElement>('[role="row"]'))
    const headerCells: HTMLElement[] = Array.from(tableRows[0]?.querySelectorAll<HTMLElement>('[role="columnheader"]') ?? [])
    const dataCells: HTMLElement[] = Array.from(tableRows[1]?.querySelectorAll<HTMLElement>('[role="cell"]') ?? [])

    expect(tableRows).toHaveLength(2)
    expect(headerCells).toHaveLength(8)
    expect(dataCells).toHaveLength(8)
  })

  it('marks the modal as drawer keep-open portal content', () : void => {
    renderModal()

    expect(container?.querySelector(DRAWER_KEEP_OPEN_SELECTOR)).not.toBeNull()
  })

  it('keeps non-data table states inside a spanning cell', () : void => {
    renderModal({ rows: [], loading: true, selectedUuids: new Set() })

    const statusCell: HTMLElement = getRequiredElement<HTMLElement>('[role="row"] [role="cell"][aria-colspan="8"]')

    expect(statusCell.querySelector('[role="status"]')).not.toBeNull()
  })

  it('blocks stale recommendation apply while an error is shown', () : void => {
    renderModal({ error: 'network down' })

    const applyButton: HTMLButtonElement | undefined = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button: HTMLButtonElement) : boolean => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    expect(container?.textContent).not.toContain('테스트 상품')
    expect(applyButton.disabled).toBe(true)
    expect(container?.textContent).toContain('추천 후보 조회 실패: network down')
  })

  it('does not enable apply with only stale selections outside visible rows', () : void => {
    renderModal({
      selectedUuids: new Set(['stale-candidate']),
    })

    const applyButton: HTMLButtonElement | undefined = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button: HTMLButtonElement) : boolean => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    expect(container?.textContent).toContain('추천 1개 · 선택 0개')
    expect(container?.textContent).toContain('선택 0개')
    expect(applyButton.disabled).toBe(true)
  })

  it('disables recommendation selection and apply while append is busy', () : void => {
    renderModal({ applying: true })

    const checkboxes: HTMLInputElement[] = Array.from(container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])
    const buttons: HTMLButtonElement[] = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const applyButton: HTMLButtonElement = buttons[buttons.length - 1]
    const closeButton: HTMLButtonElement = getRequiredElement<HTMLButtonElement>('button[aria-label="추천 보기 닫기"]')
    const cancelButton: HTMLButtonElement | undefined = buttons.find((button: HTMLButtonElement) : boolean => button.textContent?.trim() === '취소')
    if (!applyButton) throw new Error('Missing apply button')
    if (!cancelButton) throw new Error('Missing cancel button')

    expect(checkboxes.every((checkbox: HTMLInputElement) : boolean => checkbox.disabled)).toBe(true)
    expect(document.activeElement).toBe(getRequiredElement<HTMLDivElement>('[role="dialog"]'))
    expect(closeButton.disabled).toBe(true)
    expect(cancelButton.disabled).toBe(true)
    expect(applyButton.disabled).toBe(true)
    expect(container?.textContent).toContain('추천 후보 적용 중')
    expect(applyButton.textContent?.trim()).toBe('적용 중')
  })

  it('disables visible recommendation selection while refresh is loading', () : void => {
    renderModal({ loading: true })

    const checkboxes: HTMLInputElement[] = Array.from(container?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])

    expect(checkboxes.every((checkbox: HTMLInputElement) : boolean => checkbox.disabled)).toBe(true)
    expect(container?.textContent).toContain('추천 후보 로딩 중')
  })

  it('keeps Tab and Shift+Tab focus inside the modal', () : void => {
    renderModal()

    const closeButton: HTMLButtonElement = getRequiredElement<HTMLButtonElement>('button[aria-label="추천 보기 닫기"]')
    const applyButton: HTMLButtonElement | undefined = Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((button: HTMLButtonElement) : boolean => button.textContent?.trim() === '추천 적용')
    if (!applyButton) throw new Error('Missing apply button')

    closeButton.focus()
    act(() : void => {
      closeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })
    expect(document.activeElement).toBe(applyButton)

    act(() : void => {
      applyButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(document.activeElement).toBe(closeButton)
  })

  it('closes the modal with Escape', () : void => {
    const { props }: { props: ModalProps; } = renderModal()
    const dialog: HTMLDivElement = getRequiredElement<HTMLDivElement>('[role="dialog"]')

    act(() : void => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

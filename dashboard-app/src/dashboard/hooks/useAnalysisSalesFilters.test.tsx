// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisSalesFilters } from './useAnalysisSalesFilters'

vi.mock('../../api', () => ({
  getSalesFilterMeta: vi.fn(() => Promise.resolve({
    brands: [],
    categories: [],
    codes: [],
    colorCodes: [],
    productNames: [],
    historicalMonths: ['2025-01', '2025-02', '2025-03'],
  })),
}))

function Probe() {
  const filters = useAnalysisSalesFilters()
  return (
    <section>
      <output
        data-draft-start={filters.periodStartDate}
        data-draft-end={filters.periodEndDate}
        data-applied-start={filters.appliedPeriodStartDate}
        data-applied-end={filters.appliedPeriodEndDate}
        data-sales-start={filters.salesParams.startDate}
        data-sales-end={filters.salesParams.endDate}
        data-dirty={filters.periodQueryDirty}
      />
      <button type="button" onClick={() => filters.onStartDateChange('2025-01-01')}>start</button>
      <button type="button" onClick={() => filters.onEndDateChange('2025-03-31')}>end</button>
      <button type="button" onClick={filters.applyPeriodQuery}>apply</button>
    </section>
  )
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function output() {
  return container?.querySelector('output') as HTMLOutputElement
}

function clickButton(label: string) {
  const button = Array.from(container?.querySelectorAll('button') ?? [])
    .find((node) => node.textContent === label)
  if (!button) throw new Error(`Missing button: ${label}`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function renderProbe() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(<Probe />)
  })
  await act(async () => {
    await Promise.resolve()
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
})

describe('useAnalysisSalesFilters', () => {
  it('keeps draft period changes out of API params until query is applied', async () => {
    await renderProbe()
    const initialSalesStart = output().dataset.salesStart
    const initialSalesEnd = output().dataset.salesEnd

    clickButton('start')
    clickButton('end')

    expect(output().dataset.draftStart).toBe('2025-01-01')
    expect(output().dataset.draftEnd).toBe('2025-03-31')
    expect(output().dataset.salesStart).toBe(initialSalesStart)
    expect(output().dataset.salesEnd).toBe(initialSalesEnd)
    expect(output().dataset.dirty).toBe('true')

    clickButton('apply')

    expect(output().dataset.appliedStart).toBe('2025-01-01')
    expect(output().dataset.appliedEnd).toBe('2025-03-31')
    expect(output().dataset.salesStart).toBe('2025-01-01')
    expect(output().dataset.salesEnd).toBe('2025-03-31')
    expect(output().dataset.dirty).toBe('false')
  })
})

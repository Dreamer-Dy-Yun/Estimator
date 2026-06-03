import type { SelfSalesParams } from '../../api'
import type { AnalysisFacetOptionValues, AnalysisFacetValues } from '../model/analysisFacetFilter'
import type { FilterField } from '../model/filterField'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import { useAnalysisSalesFilters } from './useAnalysisSalesFilters'

vi.mock('../../api', () : { getSalesFilterMeta: Mock<() => Promise<{ brands: never[]; categories: never[]; codes: never[]; colorCodes: never[]; productNames: never[]; historicalMonths: string[]; }>>; } => ({
  getSalesFilterMeta: vi.fn(() : Promise<{ brands: never[]; categories: never[]; codes: never[]; colorCodes: never[]; productNames: never[]; historicalMonths: string[]; }> => Promise.resolve({
    brands: [],
    categories: [],
    codes: [],
    colorCodes: [],
    productNames: [],
    historicalMonths: ['2025-01', '2025-02', '2025-03'],
  })),
}))

function Probe() : React.JSX.Element {
  const filters: { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } = useAnalysisSalesFilters()
  return (
    <section>
      <output
        data-draft-start={filters.periodStartDate}
        data-draft-end={filters.periodEndDate}
        data-applied-start={filters.appliedPeriodStartDate}
        data-applied-end={filters.appliedPeriodEndDate}
        data-sales-start={filters.salesParams.startDate}
        data-sales-end={filters.salesParams.endDate}
        data-sales-brand={'brand' in filters.salesParams ? String(filters.salesParams.brand) : ''}
        data-dirty={filters.periodQueryDirty}
      />
      <button type="button" onClick={() : void => filters.onStartDateChange('2025-01-01')}>start</button>
      <button type="button" onClick={() : void => filters.onEndDateChange('2025-03-31')}>end</button>
      <button type="button" onClick={filters.applyPeriodQuery}>apply</button>
      <button
        type="button"
        onClick={() : void | undefined => filters.buildListFilterFields({
          brand: ['전체', '나이키'],
          category: ['전체'],
          code: ['전체'],
          productName: ['전체'],
          colorCode: ['전체'],
        })[0]?.onChange?.('나이키')}
      >
        brand
      </button>
    </section>
  )
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function output() : HTMLOutputElement {
  return container?.querySelector('output') as HTMLOutputElement
}

function clickButton(label: string) : void {
  const button: HTMLButtonElement | undefined = Array.from(container?.querySelectorAll('button') ?? [])
    .find((node: HTMLButtonElement) : boolean => node.textContent === label)
  if (!button) throw new Error(`Missing button: ${label}`)
  act(() : void => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function renderProbe() : Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () : Promise<void> => {
    root?.render(<Probe />)
  })
  await act(async () : Promise<void> => {
    await Promise.resolve()
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
})

describe('useAnalysisSalesFilters', () : void => {
  it('keeps draft period changes out of API params until query is applied', async () : Promise<void> => {
    await renderProbe()
    const initialSalesStart: string | undefined = output().dataset.salesStart
    const initialSalesEnd: string | undefined = output().dataset.salesEnd

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

  it('keeps list facet filters out of API params', async () : Promise<void> => {
    await renderProbe()

    clickButton('brand')

    expect(output().dataset.salesBrand).toBe('')
  })
})

// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import type { CandidateStashSummary } from '../../../api'
import { useCandidateDataReferencePeriod, type AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'

const DETAIL_TARGET: CandidateStashSummary = {
  uuid: 'stash-1',
  name: '후보군',
  note: null,
  periodStart: '2024-01-01',
  periodEnd: '2024-12-31',
  forecastMonths: 8,
  itemCount: 1,
  dbCreatedAt: '2026-05-19T00:00:00.000Z',
  dbUpdatedAt: '2026-05-19T00:00:00.000Z',
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({
  loadItems,
  onDataReferencePeriodApplied = () : undefined => undefined,
}: {
  loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>
  onDataReferencePeriodApplied?: () => void
}) : React.JSX.Element {
  const appliedPeriodRef: React.RefObject<AppliedCandidateDataReferencePeriod> = useRef<AppliedCandidateDataReferencePeriod>({ start: '', end: '' })
  const model: { dataReferencePeriodStart: string; dataReferencePeriodEnd: string; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; } = useCandidateDataReferencePeriod({
    detailTarget: DETAIL_TARGET,
    appliedPeriodRef,
    setItems: () : undefined => undefined,
    clearRecommendationItems: () : undefined => undefined,
    closeMetricSubscription: () : undefined => undefined,
    loadItems,
    onDataReferencePeriodApplied,
  })

  return (
    <>
      <output
        data-start={model.dataReferencePeriodStart}
        data-end={model.dataReferencePeriodEnd}
      />
      <button type="button" data-testid="set-start" onClick={() : void => model.onDataReferencePeriodStartChange('2026-01-01')} />
      <button type="button" data-testid="apply" onClick={model.applyDataReferencePeriod} />
    </>
  )
}

function renderProbe(
  loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>,
  onDataReferencePeriodApplied?: () => void,
) : HTMLOutputElement {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe loadItems={loadItems} onDataReferencePeriodApplied={onDataReferencePeriodApplied} />)
  })
  return container.querySelector('output') as HTMLOutputElement
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  vi.useRealTimers()
})

describe('useCandidateDataReferencePeriod', () : void => {
  it('starts with today minus one year through today, not the stash creation period', async () : Promise<void> => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 19))
    const loadItems: Mock<() => Promise<void>> = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const output: HTMLOutputElement = renderProbe(loadItems)

    await act(async () : Promise<void> => {
      await Promise.resolve()
    })

    expect(output.dataset.start).toBe('2025-05-19')
    expect(output.dataset.end).toBe('2026-05-19')
    expect(loadItems).toHaveBeenCalledWith('2025-05-19', '2026-05-19')
  })

  it('notifies the caller when a query period is applied', async () : Promise<void> => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 19))
    const loadItems: Mock<(periodStart?: string, periodEnd?: string) => Promise<void>> = vi.fn<(periodStart?: string, periodEnd?: string) => Promise<void>>().mockResolvedValue(undefined)
    const onDataReferencePeriodApplied: Mock<(...args: unknown[]) => unknown> = vi.fn()
    renderProbe(loadItems, onDataReferencePeriodApplied)

    await act(async () : Promise<void> => {
      await Promise.resolve()
    })
    loadItems.mockClear()
    onDataReferencePeriodApplied.mockClear()

    act(() : void => {
      container?.querySelector<HTMLButtonElement>('[data-testid="set-start"]')?.click()
    })
    act(() : void => {
      container?.querySelector<HTMLButtonElement>('[data-testid="apply"]')?.click()
    })

    expect(onDataReferencePeriodApplied).toHaveBeenCalledTimes(1)
    expect(loadItems).toHaveBeenCalledWith('2026-01-01', '2026-05-19')
  })
})

// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
}: {
  loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>
}) {
  const appliedPeriodRef = useRef<AppliedCandidateDataReferencePeriod>({ start: '', end: '' })
  const model = useCandidateDataReferencePeriod({
    detailTarget: DETAIL_TARGET,
    appliedPeriodRef,
    setItems: () => undefined,
    clearRecommendationItems: () => undefined,
    closeMetricSubscription: () => undefined,
    loadItems,
  })

  return (
    <output
      data-start={model.dataReferencePeriodStart}
      data-end={model.dataReferencePeriodEnd}
    />
  )
}

function renderProbe(loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(<Probe loadItems={loadItems} />)
  })
  return container.querySelector('output') as HTMLOutputElement
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  vi.useRealTimers()
})

describe('useCandidateDataReferencePeriod', () => {
  it('starts with today minus one year through today, not the stash creation period', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 19))
    const loadItems = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const output = renderProbe(loadItems)

    await act(async () => {
      await Promise.resolve()
    })

    expect(output.dataset.start).toBe('2025-05-19')
    expect(output.dataset.end).toBe('2026-05-19')
    expect(loadItems).toHaveBeenCalledWith('2025-05-19', '2026-05-19')
  })
})

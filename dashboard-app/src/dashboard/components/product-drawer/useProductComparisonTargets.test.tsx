import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, ProductComparisonTargetParams } from '../../../api'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { dashboardApi } from '../../../api'
import { useProductComparisonTargets, type ProductComparisonTargetsState } from './useProductComparisonTargets'

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-1' }
const COMPARISON_TARGET: ProductComparisonTarget = {
  id: 'channel-a',
  kind: 'competitor-channel',
  label: 'Channel A',
  role: 'comparison',
  sourceId: 'channel-a',
}
const SAVED_COMPARISON_TARGET: ProductComparisonTarget = {
  id: 'channel-b',
  kind: 'competitor-channel',
  label: 'Channel B',
  role: 'comparison',
  sourceId: 'channel-b',
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({
  onRender,
}: {
  onRender: (state: ProductComparisonTargetsState) => void
}) : null {
  const state: ProductComparisonTargetsState = useProductComparisonTargets({
    base: BASE_SUBJECT,
    pageName: 'test',
  })
  onRender(state)
  return null
}

function renderHook() : { readonly current: ProductComparisonTargetsState; readonly renderCount: number; rerender: () => void } {
  const state: { current: ProductComparisonTargetsState | null; renderCount: number } = {
    current: null,
    renderCount: 0,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const render: () => void = () : void => {
    act(() : void => {
      root?.render(<Probe onRender={(next: ProductComparisonTargetsState) : void => {
        state.current = next
        state.renderCount += 1
      }} />)
    })
  }
  render()
  return {
    get current() : ProductComparisonTargetsState {
      if (state.current == null) throw new Error('hook result is not rendered')
      return state.current
    },
    get renderCount() : number {
      return state.renderCount
    },
    rerender: render,
  }
}

async function flushMicrotasks() : Promise<void> {
  await act(async () : Promise<void> => {
    await Promise.resolve()
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
  vi.restoreAllMocks()
})

describe('useProductComparisonTargets', () : void => {
  it('keeps comparison setters stable across rerenders', async () : Promise<void> => {
    vi.spyOn(dashboardApi, 'getProductComparisonTargets')
      .mockResolvedValue([COMPARISON_TARGET, SAVED_COMPARISON_TARGET])

    const hook: { readonly current: ProductComparisonTargetsState; readonly renderCount: number; rerender: () => void } = renderHook()
    await flushMicrotasks()

    const setComparisonTargetId: (next: string) => void = hook.current.setComparisonTargetId
    const setComparisonSubject: (next: ProductComparisonTarget) => void = hook.current.setComparisonSubject

    hook.rerender()

    expect(hook.current.setComparisonTargetId).toBe(setComparisonTargetId)
    expect(hook.current.setComparisonSubject).toBe(setComparisonSubject)
  })

  it('does not rerender when the same comparison subject is selected again', async () : Promise<void> => {
    const request: Mock<(params: ProductComparisonTargetParams) => Promise<ProductComparisonTarget[]>> = vi
      .spyOn(dashboardApi, 'getProductComparisonTargets')
      .mockResolvedValue([COMPARISON_TARGET, SAVED_COMPARISON_TARGET])

    const hook: { readonly current: ProductComparisonTargetsState; readonly renderCount: number; rerender: () => void } = renderHook()
    await flushMicrotasks()
    expect(request).toHaveBeenCalledTimes(1)

    act(() : void => {
      hook.current.setComparisonSubject(SAVED_COMPARISON_TARGET)
    })

    const renderCountAfterFirstSelection: number = hook.renderCount
    expect(hook.current.comparisonMode).toBe(SAVED_COMPARISON_TARGET.kind)
    expect(hook.current.comparisonTarget?.id).toBe(SAVED_COMPARISON_TARGET.id)

    act(() : void => {
      hook.current.setComparisonSubject(SAVED_COMPARISON_TARGET)
    })

    expect(hook.renderCount).toBe(renderCountAfterFirstSelection)
  })
})

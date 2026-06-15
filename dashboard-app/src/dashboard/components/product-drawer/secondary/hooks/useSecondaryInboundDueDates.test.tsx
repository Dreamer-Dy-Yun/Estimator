// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSecondaryInboundDueDates } from './useSecondaryInboundDueDates'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type HookResult = ReturnType<typeof useSecondaryInboundDueDates>

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ onRender }: { onRender: (result: HookResult) => void }): null {
  const result: HookResult = useSecondaryInboundDueDates()
  onRender(result)
  return null
}

function renderHook(): { readonly current: HookResult } {
  const state: { current: HookResult | null } = { current: null }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<Probe onRender={(result: HookResult): void => {
      state.current = result
    }} />)
  })
  return {
    get current(): HookResult {
      if (state.current == null) throw new Error('hook result is not rendered')
      return state.current
    },
  }
}

async function flushMicrotasks(): Promise<void> {
  await act(async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('useSecondaryInboundDueDates', (): void => {
  it('keeps next inbound due date strictly after current inbound due date', async (): Promise<void> => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 16))
    const hook: { readonly current: HookResult } = renderHook()
    await flushMicrotasks()

    act((): void => {
      hook.current.handleCurrentOrderInboundDueDateChange('2026-06-20')
    })
    expect(hook.current.currentOrderInboundDueDate).toBe('2026-06-20')
    expect(hook.current.nextOrderInboundDueDate).not.toBe('2026-06-20')

    act((): void => {
      hook.current.handleNextOrderInboundDueDateChange('2026-06-20')
    })

    expect(hook.current.nextOrderInboundDueDate).toBe('2026-06-21')
  })
})

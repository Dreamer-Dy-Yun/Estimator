// @vitest-environment jsdom
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { dashboardApi } from '../../../../../api'
import { useSecondaryInboundSplitSource, type UseSecondaryInboundSplitSourceParams, type UseSecondaryInboundSplitSourceResult } from './useSecondaryInboundSplitSource'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-1' }

function makeSource(dateStart: string, dateEnd: string, productId = 'product-a'): SecondaryInboundSplitSource {
  return {
    productId,
    dateStart,
    dateEnd,
    stockBySize: { S: 0 },
    expectationByDate: {
      [dateStart]: { S: { sale: 1, inbound: 0 } },
      '2026-04-02': { S: { sale: 1, inbound: 0 } },
      '2026-04-03': { S: { sale: 1, inbound: 0 } },
    },
  }
}

function makeApiErrorInfo(request: string, err: unknown): ApiUnitErrorInfo {
  return {
    checkedAt: '2026-06-15T00:00:00.000Z',
    page: 'test',
    request,
    error: err instanceof Error ? err.message : String(err),
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise: Promise<T> = new Promise<T>((nextResolve: (value: T) => void): void => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({
  props,
  onRender,
}: {
  props: UseSecondaryInboundSplitSourceParams
  onRender: (result: UseSecondaryInboundSplitSourceResult) => void
}): null {
  const result: UseSecondaryInboundSplitSourceResult = useSecondaryInboundSplitSource(props)
  onRender(result)
  return null
}

function renderHook(initialProps: UseSecondaryInboundSplitSourceParams): { readonly current: UseSecondaryInboundSplitSourceResult; rerender: (nextProps: UseSecondaryInboundSplitSourceParams) => void } {
  const state: { current: UseSecondaryInboundSplitSourceResult | null; props: UseSecondaryInboundSplitSourceParams } = {
    current: null,
    props: initialProps,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const render: () => void = (): void => {
    act((): void => {
      root?.render(<Probe props={state.props} onRender={(next: UseSecondaryInboundSplitSourceResult): void => {
        state.current = next
      }} />)
    })
  }
  render()
  return {
    get current(): UseSecondaryInboundSplitSourceResult {
      if (state.current == null) throw new Error('hook result is not rendered')
      return state.current
    },
    rerender: (nextProps: UseSecondaryInboundSplitSourceParams): void => {
      state.props = nextProps
      render()
    },
  }
}

async function flushMicrotasks(): Promise<void> {
  await act(async (): Promise<void> => {
    await Promise.resolve()
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
  vi.restoreAllMocks()
})

describe('useSecondaryInboundSplitSource', (): void => {
  const DEFAULT_PROPS: UseSecondaryInboundSplitSourceParams = {
    skuGroupKey: 'sku-a',
    dateStart: '2026-04-01',
    dateEnd: '2026-04-03',
    baseSubject: BASE_SUBJECT,
    makeApiErrorInfo,
  }

  it('rejects incomplete source cells at the API boundary', async (): Promise<void> => {
    const incompleteSource: SecondaryInboundSplitSource = makeSource('2026-04-01', '2026-04-03')
    delete incompleteSource.expectationByDate['2026-04-02']
    vi.spyOn(dashboardApi, 'getSecondaryInboundSplitSource').mockResolvedValue(incompleteSource)

    const hook: { readonly current: UseSecondaryInboundSplitSourceResult; rerender: (nextProps: UseSecondaryInboundSplitSourceParams) => void } = renderHook(DEFAULT_PROPS)
    await flushMicrotasks()

    expect(hook.current.inboundSplitSource).toBeNull()
    expect(hook.current.inboundSplitSourceLoading).toBe(false)
    expect(hook.current.inboundSplitSourceError?.error).toContain('expectationByDate.2026-04-02')
  })

  it('keeps stale inbound split source responses from overwriting the latest request', async (): Promise<void> => {
    const first: { promise: Promise<SecondaryInboundSplitSource>; resolve: (value: SecondaryInboundSplitSource) => void } = deferred<SecondaryInboundSplitSource>()
    const second: { promise: Promise<SecondaryInboundSplitSource>; resolve: (value: SecondaryInboundSplitSource) => void } = deferred<SecondaryInboundSplitSource>()
    const request: Mock<(params: SecondaryInboundSplitSourceParams) => Promise<SecondaryInboundSplitSource>> = vi
      .spyOn(dashboardApi, 'getSecondaryInboundSplitSource')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    const hook: { readonly current: UseSecondaryInboundSplitSourceResult; rerender: (nextProps: UseSecondaryInboundSplitSourceParams) => void } = renderHook(DEFAULT_PROPS)
    hook.rerender({ ...DEFAULT_PROPS, dateStart: '2026-04-02', dateEnd: '2026-04-04' })
    await flushMicrotasks()

    second.resolve(makeSource('2026-04-02', '2026-04-04', 'latest-product'))
    await flushMicrotasks()
    first.resolve(makeSource('2026-04-01', '2026-04-03', 'stale-product'))
    await flushMicrotasks()

    expect(request).toHaveBeenCalledTimes(2)
    expect(hook.current.inboundSplitSource?.productId).toBe('latest-product')
    expect(hook.current.inboundSplitSourceError).toBeNull()
  })
})

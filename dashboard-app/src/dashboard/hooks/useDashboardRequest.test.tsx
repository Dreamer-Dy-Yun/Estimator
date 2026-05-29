// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useDashboardRequest } from './useDashboardRequest'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

type ProbeProps = {
  request: () => Promise<string[]>
  requestKey?: string
}

const INITIAL_DATA = ['initial']

function Probe({ request, requestKey }: ProbeProps) {
  const state = useDashboardRequest(request, INITIAL_DATA, requestKey)
  return (
    <output
      data-key={state.dataKey ?? ''}
      data-request-key={state.requestKey}
      data-loading={state.loading}
      data-refreshing={state.isRefreshing}
      data-error={state.error?.message ?? ''}
      data-stale={state.isStale}
      data-updated={state.lastUpdatedAt ?? ''}
    >
      {state.data.join(',')}
    </output>
  )
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderProbe(request: () => Promise<string[]>, requestKey?: string) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(<Probe request={request} requestKey={requestKey} />)
  })
  return container.querySelector('output') as HTMLOutputElement
}

function rerenderProbe(request: () => Promise<string[]>, requestKey?: string) {
  act(() => {
    root?.render(<Probe request={request} requestKey={requestKey} />)
  })
  return container?.querySelector('output') as HTMLOutputElement
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

describe('useDashboardRequest', () => {
  it('stores successful data and marks the last updated time', async () => {
    const request = createDeferred<string[]>()
    const output = renderProbe(() => request.promise)

    expect(output.dataset.loading).toBe('true')

    await act(async () => {
      request.resolve(['loaded'])
      await request.promise
    })

    expect(output.textContent).toBe('loaded')
    expect(output.dataset.loading).toBe('false')
    expect(output.dataset.key).toBe('default')
    expect(output.dataset.error).toBe('')
    expect(output.dataset.updated).not.toBe('')
  })

  it('keeps stale data visible when a refresh fails', async () => {
    const first = createDeferred<string[]>()
    const output = renderProbe(() => first.promise)

    await act(async () => {
      first.resolve(['first'])
      await first.promise
    })

    const second = createDeferred<string[]>()
    rerenderProbe(() => second.promise)

    await act(async () => {
      second.reject(new Error('network down'))
      await second.promise.catch(() => undefined)
    })

    expect(output.textContent).toBe('first')
    expect(output.dataset.error).toBe('network down')
    expect(output.dataset.stale).toBe('true')
  })

  it('keeps the key of the last successful response', async () => {
    const first = createDeferred<string[]>()
    const output = renderProbe(() => first.promise, 'query-a')

    await act(async () => {
      first.resolve(['first'])
      await first.promise
    })

    expect(output.dataset.key).toBe('query-a')

    const second = createDeferred<string[]>()
    rerenderProbe(() => second.promise, 'query-b')

    await act(async () => {
      second.reject(new Error('network down'))
      await second.promise.catch(() => undefined)
    })

    expect(output.textContent).toBe('first')
    expect(output.dataset.key).toBe('query-a')
    expect(output.dataset.requestKey).toBe('query-b')
  })
})

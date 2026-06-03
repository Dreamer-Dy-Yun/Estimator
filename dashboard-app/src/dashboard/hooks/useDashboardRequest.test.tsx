import type { DashboardRequestState } from './useDashboardRequest'
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
  const promise: Promise<T> = new Promise<T>((nextResolve: (value: T | PromiseLike<T>) => void, nextReject: (reason?: unknown) => void) : void => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

export type ProbeProps = {
  request: () => Promise<string[]>
  requestKey?: string
}

const INITIAL_DATA: string[] = ['initial']

function Probe({ request, requestKey }: ProbeProps) : React.JSX.Element {
  const state: DashboardRequestState<string[]> = useDashboardRequest(request, INITIAL_DATA, requestKey)
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

function renderProbe(request: () => Promise<string[]>, requestKey?: string) : HTMLOutputElement {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe request={request} requestKey={requestKey} />)
  })
  return container.querySelector('output') as HTMLOutputElement
}

function rerenderProbe(request: () => Promise<string[]>, requestKey?: string) : HTMLOutputElement {
  act(() : void => {
    root?.render(<Probe request={request} requestKey={requestKey} />)
  })
  return container?.querySelector('output') as HTMLOutputElement
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

describe('useDashboardRequest', () : void => {
  it('stores successful data and marks the last updated time', async () : Promise<void> => {
    const request: Deferred<string[]> = createDeferred<string[]>()
    const output: HTMLOutputElement = renderProbe(() : Promise<string[]> => request.promise)

    expect(output.dataset.loading).toBe('true')

    await act(async () : Promise<void> => {
      request.resolve(['loaded'])
      await request.promise
    })

    expect(output.textContent).toBe('loaded')
    expect(output.dataset.loading).toBe('false')
    expect(output.dataset.key).toBe('default')
    expect(output.dataset.error).toBe('')
    expect(output.dataset.updated).not.toBe('')
  })

  it('keeps stale data visible when a refresh fails', async () : Promise<void> => {
    const first: Deferred<string[]> = createDeferred<string[]>()
    const output: HTMLOutputElement = renderProbe(() : Promise<string[]> => first.promise)

    await act(async () : Promise<void> => {
      first.resolve(['first'])
      await first.promise
    })

    const second: Deferred<string[]> = createDeferred<string[]>()
    rerenderProbe(() : Promise<string[]> => second.promise)

    await act(async () : Promise<void> => {
      second.reject(new Error('network down'))
      await second.promise.catch(() : undefined => undefined)
    })

    expect(output.textContent).toBe('first')
    expect(output.dataset.error).toBe('network down')
    expect(output.dataset.stale).toBe('true')
  })

  it('keeps the key of the last successful response', async () : Promise<void> => {
    const first: Deferred<string[]> = createDeferred<string[]>()
    const output: HTMLOutputElement = renderProbe(() : Promise<string[]> => first.promise, 'query-a')

    await act(async () : Promise<void> => {
      first.resolve(['first'])
      await first.promise
    })

    expect(output.dataset.key).toBe('query-a')

    const second: Deferred<string[]> = createDeferred<string[]>()
    rerenderProbe(() : Promise<string[]> => second.promise, 'query-b')

    await act(async () : Promise<void> => {
      second.reject(new Error('network down'))
      await second.promise.catch(() : undefined => undefined)
    })

    expect(output.textContent).toBe('first')
    expect(output.dataset.key).toBe('query-a')
    expect(output.dataset.requestKey).toBe('query-b')
  })
})

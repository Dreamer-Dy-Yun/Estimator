// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi } from '../../../../../api'
import { useSecondaryCandidateActions } from './useSecondaryCandidateActions'

vi.mock('../../../../../api', () => ({
  dashboardApi: {
    appendCandidateItem: vi.fn(),
    createCandidateStash: vi.fn(),
    getCandidateStashes: vi.fn(),
    updateCandidateItem: vi.fn(),
  },
  getCompanyUuidForOptionalScope: vi.fn((companyUuid: string | null) => companyUuid),
}))

vi.mock('../../../../../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ selectedCompanyUuid: 'company-1' })),
}))

type HookArgs = Parameters<typeof useSecondaryCandidateActions>[0]
type HookResult = ReturnType<typeof useSecondaryCandidateActions>

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ args, onRender }: { args: HookArgs, onRender: (result: HookResult) => void }) {
  onRender(useSecondaryCandidateActions(args))
  return null
}

function renderActions(args: HookArgs) {
  let current: HookResult | null = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(createElement(Probe, { args, onRender: (result) => { current = result } }))
  })
  return {
    get current() {
      if (!current) throw new Error('Hook result is not ready')
      return current
    },
  }
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

describe('useSecondaryCandidateActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setup = () => {
    const args: HookArgs = {
      skuGroupKey: 'sku-1',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      forecastMonths: 3,
      hasSavedSnapshot: false,
      candidateItemContext: null,
      buildSnapshot: vi.fn(() => ({ version: 1 }) as never),
      showToast: vi.fn(),
    }

    const hook = renderActions(args)
    return { args, hook }
  }

  it('does not report candidate creation failure when refresh fails after creation', async () => {
    vi.mocked(dashboardApi.createCandidateStash).mockResolvedValue({ uuid: 'stash-1' } as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockRejectedValue(new Error('refresh failed'))
    const { args, hook } = setup()

    act(() => {
      hook.current.setNameInput('new stash')
    })

    let result = true
    await act(async () => {
      result = await hook.current.createCandidate()
    })

    expect(result).toBe(false)
    expect(dashboardApi.createCandidateStash).toHaveBeenCalledWith(expect.objectContaining({
      name: 'new stash',
      companyUuid: 'company-1',
    }))
    expect(args.showToast).toHaveBeenCalledWith(
      '후보군은 생성됐지만 목록을 새로고침하지 못했습니다.',
      { variant: 'error' },
    )
    expect(vi.mocked(args.showToast).mock.calls.some(([message, options]) => (
      message.includes('후보군 생성 실패') && options?.variant === 'error'
    ))).toBe(false)
  })
})

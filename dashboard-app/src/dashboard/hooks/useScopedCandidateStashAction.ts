import { useCallback } from 'react'

type ShowToast = (message: string, options?: { variant?: 'error' | 'success' | 'warning' }) => void
type RefreshFailure = { ok: false; error: unknown }
type RefreshResult = void | RefreshFailure
type RefreshFailureNotice = { message: string; error: unknown }

type ScopedActionOptions<Result> = {
  actionLabel: string
  successMessage?: string
  setBusy?: (busy: boolean) => void
  mutate: (companyUuid: string) => Promise<Result>
  afterSuccess?: (result: Result) => void | Promise<void>
  onRefreshError?: (message: string, error: unknown) => void
  onError?: (message: string) => void
}

type Args = {
  scopeKey: string
  isCurrentScope: (scopeKey: string) => boolean
  requireCompanyUuid: () => string
  loadStashes: () => Promise<RefreshResult>
  showToast: ShowToast
}

const failureMessage = (actionLabel: string, err: unknown) => (
  err instanceof Error && err.message.trim() ? `${actionLabel} 실패: ${err.message}` : `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
)

const refreshFailureMessage = (actionLabel: string, err: unknown) => (
  err instanceof Error && err.message.trim()
    ? `${actionLabel} 작업은 완료됐지만 후보군 목록을 새로고침하지 못했습니다: ${err.message}`
    : `${actionLabel} 작업은 완료됐지만 후보군 목록을 새로고침하지 못했습니다. 목록을 다시 불러와 최신 상태를 확인해 주세요.`
)
const isRefreshFailure = (result: RefreshResult): result is RefreshFailure => (
  typeof result === 'object' && result !== null && 'ok' in result && result.ok === false
)

export function useScopedCandidateStashAction({ scopeKey, isCurrentScope, requireCompanyUuid, loadStashes, showToast }: Args) {
  return useCallback(async <Result = void>({ actionLabel, successMessage, setBusy, mutate, afterSuccess, onRefreshError, onError }: ScopedActionOptions<Result>) => {
    const actionScopeKey = scopeKey
    setBusy?.(true)
    try {
      const result = await mutate(requireCompanyUuid())
      if (!isCurrentScope(actionScopeKey)) return
      let refreshFailure: RefreshFailureNotice | null = null
      try {
        const refreshResult = await loadStashes()
        if (!isCurrentScope(actionScopeKey)) return
        if (isRefreshFailure(refreshResult)) {
          refreshFailure = {
            message: refreshFailureMessage(actionLabel, refreshResult.error),
            error: refreshResult.error,
          }
        }
      } catch (err) {
        if (!isCurrentScope(actionScopeKey)) return
        refreshFailure = {
          message: refreshFailureMessage(actionLabel, err),
          error: err,
        }
      }
      if (!isCurrentScope(actionScopeKey)) return
      await afterSuccess?.(result)
      if (successMessage) showToast(successMessage)
      if (refreshFailure) {
        if (onRefreshError) onRefreshError(refreshFailure.message, refreshFailure.error)
        else showToast(refreshFailure.message, { variant: 'warning' })
      }
    } catch (err) {
      if (!isCurrentScope(actionScopeKey)) return
      const message = failureMessage(actionLabel, err)
      if (onError) onError(message)
      else showToast(message, { variant: 'error' })
    } finally {
      if (isCurrentScope(actionScopeKey)) setBusy?.(false)
    }
  }, [isCurrentScope, loadStashes, requireCompanyUuid, scopeKey, showToast])
}

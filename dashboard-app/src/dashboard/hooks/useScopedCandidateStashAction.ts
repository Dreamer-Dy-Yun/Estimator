import { useCallback } from 'react'

type ShowToast = (message: string, options?: { variant?: 'error' | 'success' | 'warning' }) => void

type ScopedActionOptions<Result> = {
  actionLabel: string
  successMessage?: string
  setBusy?: (busy: boolean) => void
  mutate: (companyUuid: string) => Promise<Result>
  afterSuccess?: (result: Result) => void | Promise<void>
  onError?: (message: string) => void
}

type Args = {
  scopeKey: string
  isCurrentScope: (scopeKey: string) => boolean
  requireCompanyUuid: () => string
  loadStashes: () => Promise<void>
  showToast: ShowToast
}

const failureMessage = (actionLabel: string, err: unknown) => (
  err instanceof Error && err.message.trim() ? `${actionLabel} 실패: ${err.message}` : `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
)

export function useScopedCandidateStashAction({ scopeKey, isCurrentScope, requireCompanyUuid, loadStashes, showToast }: Args) {
  return useCallback(async <Result = void>({ actionLabel, successMessage, setBusy, mutate, afterSuccess, onError }: ScopedActionOptions<Result>) => {
    const actionScopeKey = scopeKey
    setBusy?.(true)
    try {
      const result = await mutate(requireCompanyUuid())
      if (!isCurrentScope(actionScopeKey)) return
      await loadStashes()
      if (!isCurrentScope(actionScopeKey)) return
      await afterSuccess?.(result)
      if (successMessage) showToast(successMessage)
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

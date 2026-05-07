import type { ApiUnitErrorInfo } from '../../../types'

export function makeApiErrorInfo(page: string, request: string, err: unknown): ApiUnitErrorInfo {
  return {
    checkedAt: new Date().toISOString(),
    page,
    request,
    error: err instanceof Error ? err.message : String(err),
  }
}

import { ApiClientError } from '../types/api-error'
import type { ApiFailureKind } from '../types/api-error'

const MOCK_API_ERROR_CODE = 'MOCK_API_ERROR' as const
const MOCK_API_ERROR_MESSAGE = 'Mock API request failed.' as const

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return MOCK_API_ERROR_MESSAGE
}

function classifyMockFailureKind(message: string): ApiFailureKind {
  const lowerMessage: string = message.toLowerCase()
  if (message.includes('\uB85C\uADF8\uC778')) return 'auth'
  if (message.includes('\uAD8C\uD55C')) return 'permission'
  if (message.includes('\uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4') || lowerMessage.includes('unknown mock')) return 'not-found'
  if (message.includes('\uC774\uBBF8')) return 'conflict'
  if (
    message.includes('\uC785\uB825')
    || message.includes('\uBE44\uC5B4')
    || message.includes('\uD544\uC694')
    || message.includes('\uC62C\uBC14\uB974\uC9C0')
    || lowerMessage.includes('invalid')
    || lowerMessage.includes('required')
    || lowerMessage.includes('empty')
  ) {
    return 'validation'
  }
  return 'client'
}

export function createMockApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error

  const message: string = readErrorMessage(error)
  return new ApiClientError(classifyMockFailureKind(message), message, {
    body: { message, code: MOCK_API_ERROR_CODE },
    cause: error,
    code: MOCK_API_ERROR_CODE,
  })
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as { then?: unknown }).then === 'function'
}

export function notifyMockStreamError(
  onError: ((error: unknown) => void) | undefined,
  error: unknown,
): void {
  onError?.(createMockApiError(error))
}

export function withMockApiAdapterErrors<T extends object>(api: T): T {
  return new Proxy(api, {
    get(target: T, property: string | symbol, receiver: unknown): unknown {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== 'function') return value

      return (...args: unknown[]): unknown => {
        try {
          const result: unknown = value.apply(target, args)
          if (!isPromiseLike(result)) return result
          return result.catch((error: unknown) : never => {
            throw createMockApiError(error)
          })
        } catch (error: unknown) {
          throw createMockApiError(error)
        }
      }
    },
  }) as T
}

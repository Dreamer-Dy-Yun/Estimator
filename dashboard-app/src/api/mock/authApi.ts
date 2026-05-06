import type { AuthApi, AuthSession, LoginRequest, LoginResult } from '../types'
import { sleep } from './utils'

const AUTH_SESSION_STORAGE_KEY = 'han-a-auth-session'

const MOCK_AUTH_USER = {
  id: 'mock-admin',
  name: 'Yun Daeyoung',
  role: 'admin',
} as const

function makeMockSession(username: string): AuthSession {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
  return {
    user: {
      ...MOCK_AUTH_USER,
      name: username.trim() || MOCK_AUTH_USER.name,
    },
    expiresAt,
  }
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session?.user || typeof session.expiresAt !== 'string') {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

function writeStoredSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}

function clearStoredSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export const mockAuthApi: AuthApi = {
  getCurrentSession: async () => {
    await sleep(40)
    return readStoredSession()
  },
  login: async (payload: LoginRequest): Promise<LoginResult> => {
    await sleep(120)
    const session = makeMockSession(payload.username)
    writeStoredSession(session)
    return { session }
  },
  logout: async () => {
    await sleep(40)
    clearStoredSession()
  },
}

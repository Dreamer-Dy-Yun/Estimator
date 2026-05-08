import type {
  AdminUserSummary,
  AuthApi,
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  CreateAdminUserPayload,
  LoginRequest,
  LoginResult,
  ResetAdminUserPasswordResult,
  UpdateAdminUserPayload,
  UpdateAuthUserPayload,
} from '../types'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'
export const MOCK_ADMIN_USER_UUID = '00000000-0000-4000-8000-000000000001'
export const MOCK_USER_UUID = '00000000-0000-4000-8000-000000000002'

type StoredAuthUser = AdminUserSummary & {
  password: string
}

const DEFAULT_AUTH_USERS: StoredAuthUser[] = [
  {
    uuid: MOCK_ADMIN_USER_UUID,
    loginId: 'mock-admin',
    name: '관리자',
    note: '목업 관리자 계정',
    password: 'admin',
    role: 'admin',
    mustChangePassword: false,
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
  {
    uuid: MOCK_USER_UUID,
    loginId: 'mock-user',
    name: '사용자',
    note: '목업 일반 사용자 계정',
    password: 'user',
    role: 'user',
    mustChangePassword: false,
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

let currentSession: AuthSession | null = null

const createMockUuid = () => globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`

function createTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  globalThis.crypto?.getRandomValues?.(values)
  const chars = Array.from(values, (value) => {
    const n = value || Math.floor(Math.random() * alphabet.length)
    return alphabet[n % alphabet.length]
  }).join('')
  return `Tmp-${chars}`
}

function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase()
}

function toAdminUserSummary(user: StoredAuthUser): AdminUserSummary {
  return {
    uuid: user.uuid,
    loginId: user.loginId,
    name: user.name,
    note: user.note,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
    dbUpdatedAt: user.dbUpdatedAt,
  }
}

function makeSessionUser(user: StoredAuthUser): AuthUser {
  return {
    uuid: user.uuid,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

function findUserByUuid(uuid: string) {
  return DEFAULT_AUTH_USERS.find((user) => user.uuid === uuid) ?? null
}

function makeMockSession(payload: LoginRequest): AuthSession {
  const loginId = normalizeLoginId(payload.loginId)
  const user = DEFAULT_AUTH_USERS.find((candidate) => candidate.loginId === loginId) ?? DEFAULT_AUTH_USERS[0]!

  return {
    user: makeSessionUser(user),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
  }
}

function readCurrentSession(): AuthSession | null {
  const session = currentSession
  if (!session) return null

  const user = findUserByUuid(session.user.uuid)
  if (!user || !user.isActive || new Date(session.expiresAt).getTime() <= Date.now()) {
    currentSession = null
    return null
  }

  currentSession = {
    ...session,
    user: makeSessionUser(user),
  }
  return currentSession
}

const writeCurrentSession = (session: AuthSession) => {
  currentSession = session
}

const clearCurrentSession = () => {
  currentSession = null
}

function assertLoggedInSession() {
  const session = readCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session
}

function assertAdminSession() {
  const session = assertLoggedInSession()
  if (session.user.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }
  return session
}

export const mockAuthApi: AuthApi = {
  getCurrentSession: async () => {
    await sleep(40)
    return readCurrentSession()
  },
  login: async (payload: LoginRequest): Promise<LoginResult> => {
    await sleep(120)
    const session = makeMockSession(payload)
    writeCurrentSession(session)
    return { session }
  },
  updateCurrentUser: async (payload: UpdateAuthUserPayload): Promise<AuthSession> => {
    await sleep(80)
    const current = assertLoggedInSession()
    void payload
    return current
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    assertLoggedInSession()
    void payload
  },
  getAdminUsers: async (): Promise<AdminUserSummary[]> => {
    await sleep(90)
    assertAdminSession()
    return DEFAULT_AUTH_USERS
      .map(toAdminUserSummary)
      .sort((a, b) => a.loginId.localeCompare(b.loginId))
  },
  createAdminUser: async (payload: CreateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(120)
    assertAdminSession()
    const loginId = payload.loginId.trim() || 'mock-created-user'
    const name = payload.name.trim() || loginId
    return {
      uuid: createMockUuid(),
      loginId,
      name,
      note: payload.note?.trim() || null,
      role: payload.role,
      mustChangePassword: true,
      isActive: payload.isActive,
      dbUpdatedAt: new Date().toISOString(),
    }
  },
  updateAdminUser: async (payload: UpdateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(110)
    assertAdminSession()
    const target = findUserByUuid(payload.uuid)
    const base = target ? toAdminUserSummary(target) : toAdminUserSummary(DEFAULT_AUTH_USERS[0]!)

    return {
      ...base,
      uuid: payload.uuid,
      loginId: payload.loginId.trim() || target?.loginId || 'mock-updated-user',
      name: payload.name.trim() || target?.name || payload.loginId.trim() || 'mock-updated-user',
      note: payload.note?.trim() || null,
      role: payload.role,
      mustChangePassword: base.mustChangePassword,
      isActive: payload.isActive,
      dbUpdatedAt: new Date().toISOString(),
    }
  },
  resetAdminUserPassword: async (userUuid: string): Promise<ResetAdminUserPasswordResult> => {
    await sleep(100)
    assertAdminSession()
    void userUuid
    return {
      temporaryPassword: createTemporaryPassword(),
      mustChangePassword: true,
      dbUpdatedAt: new Date().toISOString(),
    }
  },
  deleteAdminUser: async (userUuid: string): Promise<void> => {
    await sleep(100)
    assertAdminSession()
    void userUuid
  },
  logout: async () => {
    await sleep(40)
    clearCurrentSession()
  },
}

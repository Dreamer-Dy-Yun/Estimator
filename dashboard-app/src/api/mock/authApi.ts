import type { AdminUserSummary, AuthApi, AuthSession, AuthUser, ChangePasswordPayload, CreateAdminUserPayload, LoginRequest, LoginResult, ResetAdminUserPasswordResult, UpdateAdminUserPayload, UpdateAuthUserPayload } from '../types'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'
export const MOCK_ADMIN_USER_UUID = '00000000-0000-4000-8000-000000000001'
export const MOCK_USER_UUID = '00000000-0000-4000-8000-000000000002'

type StoredAuthUser = AdminUserSummary & { password: string }

let mockAuthUsers: StoredAuthUser[] = [
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

export const createMockUuid = () =>
  globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`

export const cleanMockNote = (note: string | null | undefined) => note?.trim() || null
export const touchMockRecord = () => new Date().toISOString()

function createTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  globalThis.crypto?.getRandomValues?.(values)
  return `Tmp-${Array.from(values, (value) => alphabet[(value || Math.floor(Math.random() * alphabet.length)) % alphabet.length]).join('')}`
}

const normalizeLoginId = (loginId: string) => loginId.trim().toLowerCase()

function toAdminUserSummary(user: StoredAuthUser): AdminUserSummary {
  const { uuid, loginId, name, note, role, mustChangePassword, isActive, dbUpdatedAt } = user
  return { uuid, loginId, name, note, role, mustChangePassword, isActive, dbUpdatedAt }
}

function toAuthUser({ uuid, loginId, name, role, mustChangePassword }: StoredAuthUser): AuthUser {
  return { uuid, loginId, name, role, mustChangePassword }
}

function findUserByUuid(uuid: string) {
  return mockAuthUsers.find((user) => user.uuid === uuid) ?? null
}

function replaceUser(nextUser: StoredAuthUser) {
  mockAuthUsers = mockAuthUsers.map((user) => (user.uuid === nextUser.uuid ? nextUser : user))
  return toAdminUserSummary(nextUser)
}

function requireAdminTarget(uuid: string) {
  const target = findUserByUuid(uuid)
  if (!target) throw new Error('관리자 사용자를 찾을 수 없습니다.')
  return target
}

function makeMockSession(payload: LoginRequest): AuthSession {
  const loginId = normalizeLoginId(payload.loginId)
  const user = mockAuthUsers.find((candidate) => candidate.loginId === loginId) ?? mockAuthUsers[0]!
  return {
    user: toAuthUser(user),
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

  currentSession = { ...session, user: toAuthUser(user) }
  return currentSession
}

function assertLoggedInSession() {
  const session = readCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session
}

export const assertMockSession = assertLoggedInSession

export function assertMockAdminSession() {
  const session = assertLoggedInSession()
  if (session.user.role !== 'admin') throw new Error('관리자 권한이 필요합니다.')
  return session
}

export async function runMockAdminAction<T>(delayMs: number, action: () => T | Promise<T>): Promise<T> {
  await sleep(delayMs)
  assertMockAdminSession()
  return action()
}

export const mockAuthApi: AuthApi = {
  getCurrentSession: async () => {
    await sleep(40)
    return readCurrentSession()
  },
  login: async (payload: LoginRequest): Promise<LoginResult> => {
    await sleep(120)
    const session = makeMockSession(payload)
    currentSession = session
    return { session }
  },
  updateCurrentUser: async (payload: UpdateAuthUserPayload): Promise<AuthSession> => {
    await sleep(80)
    const session = assertLoggedInSession()
    void payload
    return session
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    assertLoggedInSession()
    void payload
  },
  getAdminUsers: () =>
    runMockAdminAction(90, () => mockAuthUsers.map(toAdminUserSummary).sort((a, b) => a.loginId.localeCompare(b.loginId))),
  createAdminUser: (payload: CreateAdminUserPayload) =>
    runMockAdminAction(120, () => {
      const loginId = payload.loginId.trim()
      const user: StoredAuthUser = {
        uuid: createMockUuid(),
        loginId,
        name: payload.name.trim() || loginId,
        note: cleanMockNote(payload.note),
        password: createTemporaryPassword(),
        role: payload.role,
        mustChangePassword: true,
        isActive: payload.isActive,
        dbUpdatedAt: touchMockRecord(),
      }
      mockAuthUsers = [...mockAuthUsers, user]
      return toAdminUserSummary(user)
    }),
  updateAdminUser: (payload: UpdateAdminUserPayload) =>
    runMockAdminAction(110, () => {
      const target = requireAdminTarget(payload.uuid)
      return replaceUser({
        ...target,
        loginId: payload.loginId.trim() || target.loginId,
        name: payload.name.trim() || target.name,
        note: cleanMockNote(payload.note),
        role: payload.role,
        isActive: payload.isActive,
        dbUpdatedAt: touchMockRecord(),
      })
    }),
  resetAdminUserPassword: (userUuid: string): Promise<ResetAdminUserPasswordResult> =>
    runMockAdminAction(100, () => {
      const target = requireAdminTarget(userUuid)
      const temporaryPassword = createTemporaryPassword()
      const dbUpdatedAt = touchMockRecord()
      replaceUser({ ...target, password: temporaryPassword, mustChangePassword: true, dbUpdatedAt })
      return {
        temporaryPassword,
        mustChangePassword: true,
        dbUpdatedAt,
      }
    }),
  deleteAdminUser: (userUuid: string) =>
    runMockAdminAction(100, () => {
      requireAdminTarget(userUuid)
      mockAuthUsers = mockAuthUsers.filter((user) => user.uuid !== userUuid)
    }),
  logout: async () => {
    await sleep(40)
    currentSession = null
  },
}

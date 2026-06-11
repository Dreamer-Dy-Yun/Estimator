import type { AdminUserSummary, AuthApi, AuthSession, AuthUser, ChangePasswordPayload, CreateAdminUserPayload, LoginRequest, LoginResult, ResetAdminUserPasswordResult, UpdateAdminUserPayload, UpdateAuthUserPayload } from '../types'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z' as const
export const MOCK_ADMIN_USER_UUID = '00000000-0000-4000-8000-000000000001' as const
export const MOCK_USER_UUID = '00000000-0000-4000-8000-000000000002' as const

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

export const createMockUuid: () => `${string}-${string}-${string}-${string}-${string}` = () : `${string}-${string}-${string}-${string}-${string}` =>
  globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`

export const cleanMockNote: (note: string | null | undefined) => string | null = (note: string | null | undefined) : string | null => note?.trim() || null
export const touchMockRecord: () => string = () : string => new Date().toISOString()

function createTemporaryPassword() : string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' as const
  const values: Uint32Array<ArrayBuffer> = new Uint32Array(12)
  globalThis.crypto?.getRandomValues?.(values)
  return `Tmp-${Array.from(values, (value: number) : string => alphabet[(value || Math.floor(Math.random() * alphabet.length)) % alphabet.length]).join('')}`
}

const normalizeLoginId: (loginId: string) => string = (loginId: string) : string => loginId.trim().toLowerCase()

function toAdminUserSummary(user: StoredAuthUser): AdminUserSummary {
  const { uuid, loginId, name, note, role, mustChangePassword, isActive, dbUpdatedAt }: StoredAuthUser = user
  return { uuid, loginId, name, note, role, mustChangePassword, isActive, dbUpdatedAt }
}

function toAuthUser({ uuid, loginId, name, role, mustChangePassword }: StoredAuthUser): AuthUser {
  return { uuid, loginId, name, role, mustChangePassword }
}

function findUserByUuid(uuid: string) : StoredAuthUser | null {
  return mockAuthUsers.find((user: StoredAuthUser) : boolean => user.uuid === uuid) ?? null
}

function replaceUser(nextUser: StoredAuthUser) : AdminUserSummary {
  mockAuthUsers = mockAuthUsers.map((user: StoredAuthUser) : StoredAuthUser => (user.uuid === nextUser.uuid ? nextUser : user))
  return toAdminUserSummary(nextUser)
}

function requireAdminTarget(uuid: string) : StoredAuthUser {
  const target: StoredAuthUser | null = findUserByUuid(uuid)
  if (!target) throw new Error('관리자 사용자를 찾을 수 없습니다.')
  return target
}

function makeMockSession(payload: LoginRequest): AuthSession {
  const loginId: string = normalizeLoginId(payload.loginId)
  const user: StoredAuthUser = mockAuthUsers.find((candidate: StoredAuthUser) : boolean => candidate.loginId === loginId) ?? mockAuthUsers[0]!
  return {
    user: toAuthUser(user),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
  }
}

function readCurrentSession(): AuthSession | null {
  const session: AuthSession | null = currentSession
  if (!session) return null

  const user: StoredAuthUser | null = findUserByUuid(session.user.uuid)
  if (!user || !user.isActive || new Date(session.expiresAt).getTime() <= Date.now()) {
    currentSession = null
    return null
  }

  currentSession = { ...session, user: toAuthUser(user) }
  return currentSession
}

function assertLoggedInSession() : AuthSession {
  const session: AuthSession | null = readCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session
}

export const assertMockSession: () => AuthSession = assertLoggedInSession

function assertMockAdminSession() : AuthSession {
  const session: AuthSession = assertLoggedInSession()
  if (session.user.role !== 'admin') throw new Error('관리자 권한이 필요합니다.')
  return session
}

export async function runMockAdminAction<T>(delayMs: number, action: () => T | Promise<T>): Promise<T> {
  await sleep(delayMs)
  assertMockAdminSession()
  return action()
}

export const mockAuthApi: AuthApi = {
  getCurrentSession: async () : Promise<AuthSession | null> => {
    await sleep(40)
    return readCurrentSession()
  },
  login: async (payload: LoginRequest): Promise<LoginResult> => {
    await sleep(120)
    const session: AuthSession = makeMockSession(payload)
    currentSession = session
    return { session }
  },
  updateCurrentUser: async (payload: UpdateAuthUserPayload): Promise<AuthSession> => {
    await sleep(80)
    const session: AuthSession = assertLoggedInSession()
    const target: StoredAuthUser | null = findUserByUuid(session.user.uuid)
    if (!target) {
      throw new Error('로그인이 필요합니다.')
    }

    const nextLoginId: string = payload.loginId.trim()
    const nextName: string = payload.name.trim()
    if (nextLoginId.length === 0) {
      throw new Error('로그인 ID를 입력하세요.')
    }
    if (nextName.length === 0) {
      throw new Error('이름을 입력하세요.')
    }

    const normalizedLoginId: string = normalizeLoginId(nextLoginId)
    const duplicatedUser: StoredAuthUser | undefined = mockAuthUsers.find(
      (user: StoredAuthUser): boolean =>
        user.uuid !== target.uuid && normalizeLoginId(user.loginId) === normalizedLoginId,
    )
    if (duplicatedUser) {
      throw new Error('이미 같은 로그인 ID가 있습니다. 다른 로그인 ID를 입력하세요.')
    }

    const nextUser: StoredAuthUser = {
      ...target,
      loginId: nextLoginId,
      name: nextName,
      dbUpdatedAt: touchMockRecord(),
    }
    replaceUser(nextUser)
    currentSession = {
      ...session,
      user: toAuthUser(nextUser),
    }
    return currentSession
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    assertLoggedInSession()
    void payload
  },
  getAdminUsers: () : Promise<AdminUserSummary[]> =>
    runMockAdminAction(90, () : AdminUserSummary[] => mockAuthUsers.map(toAdminUserSummary).sort((a: AdminUserSummary, b: AdminUserSummary) : number => a.loginId.localeCompare(b.loginId))),
  createAdminUser: (payload: CreateAdminUserPayload) : Promise<AdminUserSummary> =>
    runMockAdminAction(120, () : AdminUserSummary => {
      const loginId: string = payload.loginId.trim()
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
  updateAdminUser: (payload: UpdateAdminUserPayload) : Promise<AdminUserSummary> =>
    runMockAdminAction(110, () : AdminUserSummary => {
      const target: StoredAuthUser = requireAdminTarget(payload.uuid)
      return replaceUser({
        ...target,
        note: cleanMockNote(payload.note),
        role: payload.role,
        isActive: payload.isActive,
        dbUpdatedAt: touchMockRecord(),
      })
    }),
  resetAdminUserPassword: (userUuid: string): Promise<ResetAdminUserPasswordResult> =>
    runMockAdminAction(100, () : { temporaryPassword: string; mustChangePassword: true; dbUpdatedAt: string; } => {
      const target: StoredAuthUser = requireAdminTarget(userUuid)
      const temporaryPassword: string = createTemporaryPassword()
      const dbUpdatedAt: string = touchMockRecord()
      replaceUser({ ...target, password: temporaryPassword, mustChangePassword: true, dbUpdatedAt })
      return {
        temporaryPassword,
        mustChangePassword: true,
        dbUpdatedAt,
      }
    }),
  deleteAdminUser: (userUuid: string) : Promise<void> =>
    runMockAdminAction(100, () : void => {
      requireAdminTarget(userUuid)
      mockAuthUsers = mockAuthUsers.filter((user: StoredAuthUser) : boolean => user.uuid !== userUuid)
    }),
  logout: async () : Promise<void> => {
    await sleep(40)
    currentSession = null
  },
}

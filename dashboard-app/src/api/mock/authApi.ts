import type {
  AdminUserSummary,
  AuthApi,
  AuthSession,
  AuthUser,
  ChangePasswordPayload,
  CreateAdminUserPayload,
  LoginRequest,
  LoginResult,
  UpdateAdminUserPayload,
  UpdateAuthUserPayload,
} from '../types'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'

type StoredAuthUser = AdminUserSummary & {
  password: string
}

const DEFAULT_AUTH_USERS: StoredAuthUser[] = [
  {
    uuid: '00000000-0000-4000-8000-000000000001',
    loginId: 'mock-admin',
    password: 'admin',
    role: 'admin',
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
  {
    uuid: '00000000-0000-4000-8000-000000000002',
    loginId: 'mock-user',
    password: 'user',
    role: 'user',
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

let currentSession: AuthSession | null = null

const createMockUuid = () => globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`

function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase()
}

function assertValidLoginId(loginId: string) {
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginId)) {
    throw new Error('로그인 ID는 영문 소문자, 숫자, ., _, - 조합 3~32자로 입력해 주세요.')
  }
}

function toAdminUserSummary(user: StoredAuthUser): AdminUserSummary {
  const { password: _password, ...summary } = user
  return summary
}

function makeSessionUser(user: StoredAuthUser): AuthUser {
  return {
    uuid: user.uuid,
    loginId: user.loginId,
    role: user.role,
  }
}

function findUserByUuid(uuid: string) {
  return DEFAULT_AUTH_USERS.find((user) => user.uuid === uuid) ?? null
}

function assertUniqueLoginId(loginId: string, currentUuid?: string) {
  if (DEFAULT_AUTH_USERS.some((user) => user.loginId === loginId && user.uuid !== currentUuid)) {
    throw new Error('이미 등록된 로그인 ID입니다.')
  }
}

function makeMockSession(payload: LoginRequest): AuthSession {
  const loginId = normalizeLoginId(payload.loginId)
  const password = payload.password
  assertValidLoginId(loginId)
  if (!password) throw new Error('아이디와 비밀번호를 확인해 주세요.')

  const user = DEFAULT_AUTH_USERS.find((candidate) => candidate.loginId === loginId)
  if (!user || !user.isActive || user.password !== password) {
    throw new Error('아이디와 비밀번호를 확인해 주세요.')
  }

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
    const loginId = normalizeLoginId(payload.loginId)
    assertValidLoginId(loginId)
    assertUniqueLoginId(loginId, current.user.uuid)
    return current
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    const current = assertLoggedInSession()
    const target = findUserByUuid(current.user.uuid)
    if (!target || target.password !== payload.currentPassword) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.')
    }
    if (payload.newPassword.length < 4) {
      throw new Error('새 비밀번호는 4자 이상이어야 합니다.')
    }
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
    const loginId = normalizeLoginId(payload.loginId)
    assertValidLoginId(loginId)
    assertUniqueLoginId(loginId)
    if (payload.password.length < 4) {
      throw new Error('비밀번호는 4자 이상이어야 합니다.')
    }
    return {
      uuid: createMockUuid(),
      loginId,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: new Date().toISOString(),
    }
  },
  updateAdminUser: async (payload: UpdateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(110)
    const session = assertAdminSession()
    const target = findUserByUuid(payload.uuid)
    if (!target) throw new Error('사용자를 찾을 수 없습니다.')

    const loginId = normalizeLoginId(payload.loginId)
    assertValidLoginId(loginId)
    assertUniqueLoginId(loginId, target.uuid)
    if (target.uuid === session.user.uuid && (!payload.isActive || payload.role !== 'admin')) {
      throw new Error('현재 로그인한 관리자 권한과 활성 상태는 이 화면에서 바꿀 수 없습니다.')
    }

    return {
      ...toAdminUserSummary(target),
      loginId,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: new Date().toISOString(),
    }
  },
  deleteAdminUser: async (userUuid: string): Promise<void> => {
    await sleep(100)
    const session = assertAdminSession()
    const target = findUserByUuid(userUuid)
    if (!target) throw new Error('사용자를 찾을 수 없습니다.')
    if (target.uuid === session.user.uuid) {
      throw new Error('현재 로그인한 관리자는 제거할 수 없습니다.')
    }
  },
  logout: async () => {
    await sleep(40)
    clearCurrentSession()
  },
}

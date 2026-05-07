import type {
  AdminUserSummary,
  AuthApi,
  AuthRole,
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

const AUTH_SESSION_STORAGE_KEY = 'han-a-auth-session'
const AUTH_USERS_STORAGE_KEY = 'han-a-auth-users'
const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'
const LEGACY_PASSWORD_FALLBACK = 'password'

type StoredAuthUser = AdminUserSummary & {
  password: string
}

type LegacyAuthUser = Partial<StoredAuthUser> & {
  id?: string
  userId?: string
  name?: string
  initialPassword?: string
  role?: unknown
}

const MOCK_AUTH_USER: AuthUser = {
  uuid: '00000000-0000-4000-8000-000000000001',
  loginId: 'mock-admin',
  role: 'admin',
}

const DEFAULT_AUTH_USERS: StoredAuthUser[] = [
  {
    uuid: MOCK_AUTH_USER.uuid,
    loginId: MOCK_AUTH_USER.loginId,
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

function createMockUuid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const randomBlock = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16)
  return `${randomBlock()}${randomBlock()}-${randomBlock()}-4${randomBlock().slice(1)}-${variant}${randomBlock().slice(1)}-${randomBlock()}${randomBlock()}${randomBlock()}`
}

function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase()
}

function isValidLoginId(loginId: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(loginId)
}

function isAuthRole(role: unknown): role is AuthRole {
  return role === 'admin' || role === 'user'
}

function normalizeAuthRole(role: unknown): AuthRole {
  return isAuthRole(role) ? role : 'user'
}

function getLegacyPasswordFallback(loginId: string) {
  return DEFAULT_AUTH_USERS.find((user) => user.loginId === loginId)?.password ?? LEGACY_PASSWORD_FALLBACK
}

function toAdminUserSummary(user: StoredAuthUser): AdminUserSummary {
  const { password: _password, ...summary } = user
  return summary
}

function normalizeStoredUser(user: LegacyAuthUser): StoredAuthUser | null {
  const rawLoginId = user.loginId ?? user.userId ?? user.id
  if (typeof rawLoginId !== 'string') return null

  const loginId = normalizeLoginId(rawLoginId)
  if (!isValidLoginId(loginId)) return null

  return {
    uuid: typeof user.uuid === 'string' && user.uuid.trim() ? user.uuid : createMockUuid(),
    loginId,
    password:
      typeof user.password === 'string' && user.password
        ? user.password
        : typeof user.initialPassword === 'string' && user.initialPassword
          ? user.initialPassword
          : getLegacyPasswordFallback(loginId),
    role: normalizeAuthRole(user.role),
    isActive: typeof user.isActive === 'boolean' ? user.isActive : true,
    dbUpdatedAt: typeof user.dbUpdatedAt === 'string' ? user.dbUpdatedAt : new Date().toISOString(),
  }
}

function readStoredUsers(): StoredAuthUser[] {
  if (typeof window === 'undefined') return DEFAULT_AUTH_USERS

  try {
    const raw = window.localStorage.getItem(AUTH_USERS_STORAGE_KEY)
    if (!raw) {
      writeStoredUsers(DEFAULT_AUTH_USERS)
      return DEFAULT_AUTH_USERS
    }

    const parsed = JSON.parse(raw) as LegacyAuthUser[]
    if (!Array.isArray(parsed)) throw new Error('invalid users')

    const users = parsed
      .map((user) => normalizeStoredUser(user))
      .filter((user): user is StoredAuthUser => Boolean(user))
    if (!users.length) throw new Error('empty users')

    if (JSON.stringify(parsed) !== JSON.stringify(users)) {
      writeStoredUsers(users)
    }
    return users
  } catch {
    writeStoredUsers(DEFAULT_AUTH_USERS)
    return DEFAULT_AUTH_USERS
  }
}

function writeStoredUsers(users: StoredAuthUser[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users))
}

function findStoredUserBySessionUser(user: unknown) {
  const users = readStoredUsers()
  const sessionUser = user as Partial<AuthUser> & { id?: string }
  const uuid = typeof sessionUser.uuid === 'string' ? sessionUser.uuid : ''
  const loginId = normalizeLoginId(
    typeof sessionUser.loginId === 'string'
      ? sessionUser.loginId
      : typeof sessionUser.id === 'string'
        ? sessionUser.id
        : '',
  )

  return users.find((candidate) => candidate.uuid === uuid || candidate.loginId === loginId) ?? null
}

function makeSessionUser(user: StoredAuthUser): AuthUser {
  return {
    uuid: user.uuid,
    loginId: user.loginId,
    role: user.role,
  }
}

function makeMockSession(payload: LoginRequest): AuthSession {
  const loginId = normalizeLoginId(payload.loginId)
  const password = payload.password
  if (!isValidLoginId(loginId) || !password) {
    throw new Error('아이디와 비밀번호를 확인해 주세요.')
  }

  const user = readStoredUsers().find((candidate) => candidate.loginId === loginId)
  if (!user || !user.isActive || user.password !== password) {
    throw new Error('아이디와 비밀번호를 확인해 주세요.')
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
  return {
    user: makeSessionUser(user),
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

    const user = findStoredUserBySessionUser(session.user)
    if (!user || !user.isActive) {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      return null
    }

    const nextSession = {
      ...session,
      user: makeSessionUser(user),
    }
    if (JSON.stringify(session) !== JSON.stringify(nextSession)) {
      writeStoredSession(nextSession)
    }
    return nextSession
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

function assertAdminSession() {
  const session = readStoredSession()
  if (!session) {
    throw new Error('로그인이 필요합니다.')
  }
  if (session.user.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }
  return session
}

function assertUniqueLoginId(users: StoredAuthUser[], loginId: string, currentUuid?: string) {
  if (users.some((user) => user.loginId === loginId && user.uuid !== currentUuid)) {
    throw new Error('이미 등록된 로그인 ID입니다.')
  }
}

export const mockAuthApi: AuthApi = {
  getCurrentSession: async () => {
    await sleep(40)
    return readStoredSession()
  },
  login: async (payload: LoginRequest): Promise<LoginResult> => {
    await sleep(120)
    const session = makeMockSession(payload)
    writeStoredSession(session)
    return { session }
  },
  updateCurrentUser: async (payload: UpdateAuthUserPayload): Promise<AuthSession> => {
    await sleep(80)
    const current = readStoredSession()
    if (!current) {
      throw new Error('로그인이 필요합니다.')
    }

    const users = readStoredUsers()
    const target = users.find((user) => user.uuid === current.user.uuid)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    const loginId = normalizeLoginId(payload.loginId)
    if (!isValidLoginId(loginId)) {
      throw new Error('로그인 ID는 영문 소문자, 숫자, ., _, - 조합 3~32자로 입력해 주세요.')
    }
    assertUniqueLoginId(users, loginId, target.uuid)

    const now = new Date().toISOString()
    const updated = {
      ...target,
      loginId,
      dbUpdatedAt: now,
    }
    writeStoredUsers(users.map((user) => (user.uuid === target.uuid ? updated : user)))

    const nextSession = {
      ...current,
      user: makeSessionUser(updated),
    }
    writeStoredSession(nextSession)
    return nextSession
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    const current = readStoredSession()
    if (!current) {
      throw new Error('로그인이 필요합니다.')
    }

    const users = readStoredUsers()
    const target = users.find((user) => user.uuid === current.user.uuid)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    if (target.password !== payload.currentPassword) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.')
    }
    if (payload.newPassword.length < 4) {
      throw new Error('새 비밀번호는 4자 이상이어야 합니다.')
    }

    const now = new Date().toISOString()
    writeStoredUsers(users.map((user) => (
      user.uuid === target.uuid ? { ...user, password: payload.newPassword, dbUpdatedAt: now } : user
    )))
  },
  getAdminUsers: async (): Promise<AdminUserSummary[]> => {
    await sleep(90)
    assertAdminSession()
    return readStoredUsers()
      .map(toAdminUserSummary)
      .sort((a, b) => a.loginId.localeCompare(b.loginId))
  },
  createAdminUser: async (payload: CreateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(120)
    assertAdminSession()
    const users = readStoredUsers()
    const loginId = normalizeLoginId(payload.loginId)
    if (!isValidLoginId(loginId)) {
      throw new Error('로그인 ID는 영문 소문자, 숫자, ., _, - 조합 3~32자로 입력해 주세요.')
    }
    assertUniqueLoginId(users, loginId)
    if (payload.password.length < 4) {
      throw new Error('비밀번호는 4자 이상이어야 합니다.')
    }

    const now = new Date().toISOString()
    const user: StoredAuthUser = {
      uuid: createMockUuid(),
      loginId,
      password: payload.password,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: now,
    }
    writeStoredUsers([...users, user])
    return toAdminUserSummary(user)
  },
  updateAdminUser: async (payload: UpdateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(110)
    const session = assertAdminSession()
    const users = readStoredUsers()
    const target = users.find((user) => user.uuid === payload.uuid)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    const loginId = normalizeLoginId(payload.loginId)
    if (!isValidLoginId(loginId)) {
      throw new Error('로그인 ID는 영문 소문자, 숫자, ., _, - 조합 3~32자로 입력해 주세요.')
    }
    assertUniqueLoginId(users, loginId, target.uuid)

    if (target.uuid === session.user.uuid && (!payload.isActive || payload.role !== 'admin')) {
      throw new Error('현재 로그인한 관리자 권한과 활성 상태는 이 화면에서 바꿀 수 없습니다.')
    }

    const now = new Date().toISOString()
    const updated = {
      ...target,
      loginId,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: now,
    }
    const nextUsers = users.map((user) => (user.uuid === target.uuid ? updated : user))
    if (!nextUsers.some((user) => user.role === 'admin' && user.isActive)) {
      throw new Error('활성 관리자 계정은 최소 1개 이상 필요합니다.')
    }
    writeStoredUsers(nextUsers)
    if (updated.uuid === session.user.uuid) {
      writeStoredSession({
        ...session,
        user: makeSessionUser(updated),
      })
    }
    return toAdminUserSummary(updated)
  },
  deleteAdminUser: async (userUuid: string): Promise<void> => {
    await sleep(100)
    const session = assertAdminSession()
    const users = readStoredUsers()
    const target = users.find((user) => user.uuid === userUuid)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    if (target.uuid === session.user.uuid) {
      throw new Error('현재 로그인한 관리자는 제거할 수 없습니다.')
    }

    const nextUsers = users.filter((user) => user.uuid !== userUuid)
    if (!nextUsers.some((user) => user.role === 'admin' && user.isActive)) {
      throw new Error('활성 관리자 계정은 최소 1개 이상 필요합니다.')
    }
    writeStoredUsers(nextUsers)
  },
  logout: async () => {
    await sleep(40)
    clearStoredSession()
  },
}

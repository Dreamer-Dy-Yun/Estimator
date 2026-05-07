import type {
  AdminUserSummary,
  AuthApi,
  AuthSession,
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

const MOCK_AUTH_USER = {
  id: 'mock-admin',
  name: 'Yun Daeyoung',
  role: 'admin',
} as const

const DEFAULT_AUTH_USERS: AdminUserSummary[] = [
  {
    id: 'mock-admin',
    name: MOCK_AUTH_USER.name,
    role: 'admin',
    email: 'admin@han-a.local',
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
  {
    id: 'mock-operator',
    name: 'Order Operator',
    role: 'operator',
    email: 'operator@han-a.local',
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
  {
    id: 'mock-viewer',
    name: 'Sales Viewer',
    role: 'viewer',
    email: 'viewer@han-a.local',
    isActive: true,
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

function readStoredUsers(): AdminUserSummary[] {
  if (typeof window === 'undefined') return DEFAULT_AUTH_USERS

  try {
    const raw = window.localStorage.getItem(AUTH_USERS_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(DEFAULT_AUTH_USERS))
      return DEFAULT_AUTH_USERS
    }
    const users = JSON.parse(raw) as AdminUserSummary[]
    if (!Array.isArray(users)) throw new Error('invalid users')
    return users
  } catch {
    window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(DEFAULT_AUTH_USERS))
    return DEFAULT_AUTH_USERS
  }
}

function writeStoredUsers(users: AdminUserSummary[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users))
}

function makeUserId(email: string, existingUsers: AdminUserSummary[]) {
  const localPart = email.split('@')[0]?.trim().toLowerCase() || 'user'
  const base = localPart.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user'
  let candidate = base
  let suffix = 2
  const existingIds = new Set(existingUsers.map((user) => user.id))
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function makeMockSession(username: string): AuthSession {
  const users = readStoredUsers()
  const adminUser = users.find((user) => user.id === MOCK_AUTH_USER.id) ?? DEFAULT_AUTH_USERS[0]!
  const name = username.trim() || adminUser.name
  if (username.trim()) {
    const now = new Date().toISOString()
    writeStoredUsers(users.map((user) => (
      user.id === adminUser.id ? { ...user, name, dbUpdatedAt: now } : user
    )))
  }
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
  return {
    user: {
      id: adminUser.id,
      name,
      role: adminUser.role,
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
  updateCurrentUser: async (payload: UpdateAuthUserPayload): Promise<AuthSession> => {
    await sleep(80)
    const current = readStoredSession()
    if (!current) {
      throw new Error('로그인이 필요합니다.')
    }

    const name = payload.name.trim()
    if (!name) {
      throw new Error('표시 이름을 입력해 주세요.')
    }

    const nextSession = {
      ...current,
      user: {
        ...current.user,
        name,
      },
    }
    writeStoredSession(nextSession)
    const users = readStoredUsers()
    const now = new Date().toISOString()
    writeStoredUsers(users.map((user) => (
      user.id === current.user.id ? { ...user, name, dbUpdatedAt: now } : user
    )))
    return nextSession
  },
  changeCurrentUserPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await sleep(90)
    const current = readStoredSession()
    if (!current) {
      throw new Error('로그인이 필요합니다.')
    }
    if (!payload.currentPassword.trim()) {
      throw new Error('현재 비밀번호를 입력해 주세요.')
    }
    if (payload.newPassword.length < 4) {
      throw new Error('새 비밀번호는 4자 이상이어야 합니다.')
    }
  },
  getAdminUsers: async (): Promise<AdminUserSummary[]> => {
    await sleep(90)
    assertAdminSession()
    return readStoredUsers().sort((a, b) => a.id.localeCompare(b.id))
  },
  createAdminUser: async (payload: CreateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(120)
    assertAdminSession()
    const users = readStoredUsers()
    const name = payload.name.trim()
    const email = payload.email.trim().toLowerCase()
    if (!name) {
      throw new Error('표시 이름을 입력해 주세요.')
    }
    if (!isValidEmail(email)) {
      throw new Error('이메일 형식이 올바르지 않습니다.')
    }
    if (users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('이미 등록된 이메일입니다.')
    }

    const now = new Date().toISOString()
    const user: AdminUserSummary = {
      id: makeUserId(email, users),
      name,
      email,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: now,
    }
    writeStoredUsers([...users, user])
    return user
  },
  updateAdminUser: async (payload: UpdateAdminUserPayload): Promise<AdminUserSummary> => {
    await sleep(110)
    const session = assertAdminSession()
    const users = readStoredUsers()
    const target = users.find((user) => user.id === payload.userId)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    const name = payload.name.trim()
    if (!name) {
      throw new Error('표시 이름을 입력해 주세요.')
    }
    if (payload.userId === session.user.id && (!payload.isActive || payload.role !== 'admin')) {
      throw new Error('현재 로그인한 관리자의 권한과 활성 상태는 이 화면에서 바꿀 수 없습니다.')
    }

    const now = new Date().toISOString()
    const updated = {
      ...target,
      name,
      role: payload.role,
      isActive: payload.isActive,
      dbUpdatedAt: now,
    }
    const nextUsers = users.map((user) => (user.id === payload.userId ? updated : user))
    if (!nextUsers.some((user) => user.role === 'admin' && user.isActive)) {
      throw new Error('활성 관리자 계정은 최소 1개 이상 필요합니다.')
    }
    writeStoredUsers(nextUsers)
    if (updated.id === session.user.id) {
      writeStoredSession({
        ...session,
        user: {
          id: updated.id,
          name: updated.name,
          role: updated.role,
        },
      })
    }
    return updated
  },
  deleteAdminUser: async (userId: string): Promise<void> => {
    await sleep(100)
    const session = assertAdminSession()
    const users = readStoredUsers()
    const target = users.find((user) => user.id === userId)
    if (!target) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    if (target.id === session.user.id) {
      throw new Error('현재 로그인한 관리자는 제거할 수 없습니다.')
    }

    const nextUsers = users.filter((user) => user.id !== userId)
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

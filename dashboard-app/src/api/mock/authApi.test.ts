import type { AdminUserSummary, AuthSession, LoginResult, ResetAdminUserPasswordResult } from '..'
import { afterEach, describe, expect, it } from 'vitest'
import { mockAuthApi } from './authApi'

describe('api/mock authApi behavior', () : void => {
  afterEach(async () : Promise<void> => {
    await mockAuthApi.logout()
  })

  it('accepts arbitrary login values as an admin mock session', async () : Promise<void> => {
    const result: LoginResult = await mockAuthApi.login({ loginId: '테스트 관리자', password: '' })
    const session: AuthSession | null = await mockAuthApi.getCurrentSession()

    expect(result.session.user.role).toBe('admin')
    expect(session?.user.role).toBe('admin')
  })

  it('keeps mock-user available for normal user role checks', async () : Promise<void> => {
    const result: LoginResult = await mockAuthApi.login({ loginId: 'mock-user', password: 'anything' })

    expect(result.session.user.role).toBe('user')
  })

  it('applies auth mutation mock state without browser persistence', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'tester', password: 'anything' })

    const originalSession = await mockAuthApi.getCurrentSession()
    const updatedProfile = await mockAuthApi.updateCurrentUser({
      loginId: originalSession?.user.loginId ?? 'mock-admin',
      name: '프로필 이름',
    })
    expect(updatedProfile.user).toMatchObject({
      loginId: 'mock-admin',
      name: '프로필 이름',
    })
    await expect(
      mockAuthApi.updateCurrentUser({
        loginId: 'mock-user',
        name: '프로필 이름',
      }),
    ).rejects.toThrow('이미 같은 로그인 ID')
    await mockAuthApi.updateCurrentUser({
      loginId: originalSession?.user.loginId ?? 'mock-admin',
      name: originalSession?.user.name ?? '관리자',
    })
    await expect(mockAuthApi.changeCurrentUserPassword({ currentPassword: '', newPassword: '' })).resolves.toBeUndefined()

    const created: AdminUserSummary = await mockAuthApi.createAdminUser({
      loginId: 'mock-created-user',
      password: '',
      name: '생성 사용자',
      note: '생성 메모',
      role: 'user',
      isActive: true,
    })
    expect(created).toMatchObject({
      loginId: 'mock-created-user',
      name: '생성 사용자',
      note: '생성 메모',
      role: 'user',
      isActive: true,
    })

    await expect(mockAuthApi.updateAdminUser({
      uuid: created.uuid,
      note: '수정 메모',
      role: 'admin',
      isActive: false,
    })).resolves.toMatchObject({
      uuid: created.uuid,
      loginId: created.loginId,
      name: created.name,
      note: '수정 메모',
      role: 'admin',
      isActive: false,
    })

    const reset: ResetAdminUserPasswordResult = await mockAuthApi.resetAdminUserPassword(created.uuid)
    expect(reset).toMatchObject({
      mustChangePassword: true,
      dbUpdatedAt: expect.any(String),
    })
    expect(reset.temporaryPassword).toMatch(/^Tmp-.{12}$/)
    await expect(mockAuthApi.deleteAdminUser(created.uuid)).resolves.toBeUndefined()
  })
})

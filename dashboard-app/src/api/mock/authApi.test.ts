import { afterEach, describe, expect, it } from 'vitest'
import { mockAuthApi } from './authApi'

describe('api/mock authApi behavior', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('accepts arbitrary login values as an admin mock session', async () => {
    const result = await mockAuthApi.login({ loginId: '테스트 관리자', password: '' })
    const session = await mockAuthApi.getCurrentSession()

    expect(result.session.user.role).toBe('admin')
    expect(session?.user.role).toBe('admin')
  })

  it('keeps mock-user available for normal user role checks', async () => {
    const result = await mockAuthApi.login({ loginId: 'mock-user', password: 'anything' })

    expect(result.session.user.role).toBe('user')
  })

  it('applies auth mutation mock state without browser persistence', async () => {
    await mockAuthApi.login({ loginId: 'tester', password: 'anything' })

    await expect(mockAuthApi.updateCurrentUser({ loginId: '' })).resolves.toBeDefined()
    await expect(mockAuthApi.changeCurrentUserPassword({ currentPassword: '', newPassword: '' })).resolves.toBeUndefined()

    const created = await mockAuthApi.createAdminUser({
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
      loginId: 'mock-updated-user',
      name: '수정 사용자',
      note: '수정 메모',
      role: 'admin',
      isActive: false,
    })).resolves.toMatchObject({
      uuid: created.uuid,
      loginId: 'mock-updated-user',
      name: '수정 사용자',
      note: '수정 메모',
      role: 'admin',
      isActive: false,
    })

    const reset = await mockAuthApi.resetAdminUserPassword(created.uuid)
    expect(reset).toMatchObject({
      mustChangePassword: true,
      dbUpdatedAt: expect.any(String),
    })
    expect(reset.temporaryPassword).toMatch(/^Tmp-.{12}$/)
    await expect(mockAuthApi.deleteAdminUser(created.uuid)).resolves.toBeUndefined()
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { mockAuthApi } from './authApi'

describe('api/mock authApi pass-through behavior', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('accepts arbitrary login values as an admin mock session', async () => {
    const result = await mockAuthApi.login({ loginId: '아무 값', password: '' })
    const session = await mockAuthApi.getCurrentSession()

    expect(result.session.user.role).toBe('admin')
    expect(session?.user.role).toBe('admin')
  })

  it('keeps mock-user available for normal user role checks', async () => {
    const result = await mockAuthApi.login({ loginId: 'mock-user', password: 'anything' })

    expect(result.session.user.role).toBe('user')
  })

  it('lets auth mutation stubs pass without browser persistence', async () => {
    await mockAuthApi.login({ loginId: 'tester', password: 'anything' })

    await expect(mockAuthApi.updateCurrentUser({ loginId: '' })).resolves.toBeDefined()
    await expect(mockAuthApi.changeCurrentUserPassword({ currentPassword: '', newPassword: '' })).resolves.toBeUndefined()
    await expect(mockAuthApi.createAdminUser({
      loginId: '',
      password: '',
      role: 'user',
      isActive: true,
    })).resolves.toMatchObject({
      loginId: 'mock-created-user',
      role: 'user',
      isActive: true,
    })
    await expect(mockAuthApi.updateAdminUser({
      uuid: 'unknown-user',
      loginId: '',
      role: 'admin',
      isActive: false,
    })).resolves.toMatchObject({
      uuid: 'unknown-user',
      loginId: 'mock-updated-user',
      role: 'admin',
      isActive: false,
    })
    const reset = await mockAuthApi.resetAdminUserPassword('unknown-user')
    expect(reset).toMatchObject({
      mustChangePassword: true,
      dbUpdatedAt: expect.any(String),
    })
    expect(reset.temporaryPassword).toMatch(/^Tmp-.{12}$/)
    await expect(mockAuthApi.deleteAdminUser('unknown-user')).resolves.toBeUndefined()
  })
})

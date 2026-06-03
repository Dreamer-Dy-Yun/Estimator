import { useState } from 'react'
import { deleteAdminGptKey, testAdminGptKey, updateAdminGptKey } from '../api'
import type { AdminGptKeyPurpose, AdminGptKeySummary, AdminGptKeyTestResult } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { GPT_KEY_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminGptKeyDialog({
  gptKey,
  onClose,
  onChanged,
  onDeleted,
  onTested,
}: {
  gptKey: AdminGptKeySummary
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
  onTested: (result: AdminGptKeyTestResult) => void
}) : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [name, setName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(gptKey.name)
  const [purpose, setPurpose]: [AdminGptKeyPurpose, React.Dispatch<React.SetStateAction<AdminGptKeyPurpose>>] = useState<AdminGptKeyPurpose>(gptKey.purpose)
  const [model, setModel]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(gptKey.model)
  const [note, setNote]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(gptKey.note ?? '')
  const [isActive, setIsActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(gptKey.isActive)
  const [rotateKey, setRotateKey]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [rowMessage, setRowMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isSaving, setIsSaving]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [isTesting, setIsTesting]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [isDeleting, setIsDeleting]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [deleteConfirm, setDeleteConfirm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const isBusy: boolean = isSaving || isTesting || isDeleting
  const isDirty: boolean =
    name !== gptKey.name ||
    purpose !== gptKey.purpose ||
    model !== gptKey.model ||
    note !== (gptKey.note ?? '') ||
    isActive !== gptKey.isActive ||
    rotateKey.trim().length > 0

  const handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)
    const nextPlainKey: string = rotateKey.trim()
    const hasNewPlainKey: boolean = nextPlainKey.length > 0

    try {
      await updateAdminGptKey({
        uuid: gptKey.uuid,
        name,
        purpose,
        model,
        isActive,
        note,
        plainKey: hasNewPlainKey ? nextPlainKey : undefined,
      })
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onChanged)
      if (hasNewPlainKey) setRotateKey('')
      const successRowMessage: '변경됨' | '변경됨 · 키 교체됨' = hasNewPlainKey ? '변경됨 · 키 교체됨' : '변경됨'
      const successToastMessage: 'GPT 키 정보와 API 키를 변경했습니다.' | 'GPT 키 정보를 변경했습니다.' = hasNewPlainKey ? 'GPT 키 정보와 API 키를 변경했습니다.' : 'GPT 키 정보를 변경했습니다.'
      setRowMessage(refreshWarningMessage ? `${successRowMessage} · ${refreshWarningMessage}` : successRowMessage)
      showToast(refreshWarningMessage ?? successToastMessage, refreshWarningMessage ? { variant: 'warning' } : undefined)
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest: () => Promise<void> = async () : Promise<void> => {
    setErrorMessage(null)
    setRowMessage(null)
    setIsTesting(true)

    try {
      const result: AdminGptKeyTestResult = await testAdminGptKey(gptKey.uuid)
      onTested(result)
      setRowMessage(result.message)
      showToast(result.message, { variant: result.status === 'success' ? 'success' : 'error' })
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete: () => Promise<void> = async () : Promise<void> => {
    setErrorMessage(null)
    setRowMessage(null)

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setRowMessage('삭제 버튼을 한 번 더 누르면 GPT 키가 삭제됩니다.')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAdminGptKey(gptKey.uuid)
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onDeleted)
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={isBusy ? undefined : onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-gpt-key-dialog-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>GPT 키 관리</span>
            <h3 id="admin-gpt-key-dialog-title">상세 설정</h3>
          </div>
          <button className={styles.gptKeyDialogCloseButton} type="button" onClick={onClose} disabled={isBusy} aria-label="닫기">
            x
          </button>
        </header>

        <form id="admin-gpt-key-detail-form" className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <label className={styles.createField}>
            <span>이름</span>
            <input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setName(event.target.value)} maxLength={80} />
          </label>
          <label className={styles.createField}>
            <span>용도</span>
            <select value={purpose} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setPurpose(event.target.value as AdminGptKeyPurpose)}>
              {GPT_KEY_PURPOSE_OPTIONS.map((option: { value: AdminGptKeyPurpose; label: string; }) : React.JSX.Element => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.createField}>
            <span>모델</span>
            <input value={model} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setModel(event.target.value)} maxLength={80} />
          </label>
          <div className={styles.createActiveField}>
            <AdminActiveSwitch checked={isActive} onChange={setIsActive} />
          </div>
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>메모</span>
            <input value={note} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNote(event.target.value)} maxLength={200} />
          </label>
        </form>

        <div className={styles.gptKeyDialogKeyTools}>
          <label className={styles.createField}>
            <span>새 GPT API 키</span>
            <input
              value={rotateKey}
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setRotateKey(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          <button className={styles.secondaryButton} type="button" onClick={handleTest} disabled={isBusy}>
            {isTesting ? <LoadingSpinner size="inline" label="테스트 중" /> : '연결 테스트'}
          </button>
        </div>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isBusy}>
            {isDeleting ? <LoadingSpinner size="inline" label="삭제 중" /> : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button
            className={styles.createButton}
            type="submit"
            form="admin-gpt-key-detail-form"
            disabled={!isDirty || isBusy}
          >
            {isSaving ? <LoadingSpinner size="inline" label="변경 중" /> : '변경'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={isBusy}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}

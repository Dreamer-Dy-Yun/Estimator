import type { LoadedGoogleSheetKey } from './AdminGoogleSheetKeyDropzone'
import { useState } from 'react'
import { deleteAdminGoogleSheetConfig, updateAdminGoogleSheetConfig } from '../api'
import type { AdminGoogleSheetConfigSummary, AdminGoogleSheetPurpose } from '../api'
import type { CompanySummary } from '../api/types/company'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminGoogleSheetKeyDropzone } from './AdminGoogleSheetKeyDropzone'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { GOOGLE_SHEET_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

export interface AdminGoogleSheetDialogProps {
  config: AdminGoogleSheetConfigSummary
  companies: CompanySummary[]
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
}

const formId = 'admin-google-sheet-detail-form' as const

export function AdminGoogleSheetDialog({
  config,
  companies,
  onClose,
  onChanged,
  onDeleted,
}: AdminGoogleSheetDialogProps) : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [companyUuid, setCompanyUuid]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(config.companyUuid)
  const [name, setName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(config.name)
  const [purpose, setPurpose]: [AdminGoogleSheetPurpose, React.Dispatch<React.SetStateAction<AdminGoogleSheetPurpose>>] = useState<AdminGoogleSheetPurpose>(config.purpose)
  const [spreadsheetUrl, setSpreadsheetUrl]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(config.spreadsheetUrl)
  const [isActive, setIsActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(config.isActive)
  const [note, setNote]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(config.note ?? '')
  const [serviceAccountKeyJson, setServiceAccountKeyJson]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [serviceAccountFileName, setServiceAccountFileName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [serviceAccountEmail, setServiceAccountEmail]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [rowMessage, setRowMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isSaving, setIsSaving]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [isDeleting, setIsDeleting]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [deleteConfirm, setDeleteConfirm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const hasNewKey: boolean = serviceAccountKeyJson.trim().length > 0
  const canSubmitCompany: boolean = companies.length > 0 && companyUuid.trim().length > 0
  const isDirty: boolean =
    companyUuid !== config.companyUuid ||
    name !== config.name ||
    purpose !== config.purpose ||
    spreadsheetUrl !== config.spreadsheetUrl ||
    isActive !== config.isActive ||
    note !== (config.note ?? '') ||
    hasNewKey

  const handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)

    if (!canSubmitCompany) {
      setErrorMessage('회사를 선택해야 합니다.')
      return
    }

    setIsSaving(true)

    try {
      await updateAdminGoogleSheetConfig({
        uuid: config.uuid,
        companyUuid,
        name,
        purpose,
        spreadsheetUrl,
        isActive,
        note,
        serviceAccountKeyJson: hasNewKey ? serviceAccountKeyJson : undefined,
      })
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onChanged)
      if (hasNewKey) {
        setServiceAccountKeyJson('')
        setServiceAccountFileName('')
        setServiceAccountEmail('')
      }
      const successRowMessage: '변경됨 · JSON 키 교체됨' | '변경됨' = hasNewKey ? '변경됨 · JSON 키 교체됨' : '변경됨'
      const successToastMessage: '구글 시트 설정과 JSON 키를 변경했습니다.' | '구글 시트 설정을 변경했습니다.' = hasNewKey ? '구글 시트 설정과 JSON 키를 변경했습니다.' : '구글 시트 설정을 변경했습니다.'
      setRowMessage(refreshWarningMessage ? `${successRowMessage} · ${refreshWarningMessage}` : successRowMessage)
      showToast(refreshWarningMessage ?? successToastMessage, refreshWarningMessage ? { variant: 'warning' } : undefined)
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete: () => Promise<void> = async () : Promise<void> => {
    setErrorMessage(null)
    setRowMessage(null)

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setRowMessage('삭제 버튼을 한 번 더 누르면 구글 시트 설정이 삭제됩니다.')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAdminGoogleSheetConfig(config.uuid, { companyUuid: config.companyUuid })
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
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={isSaving || isDeleting ? undefined : onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-google-sheet-dialog-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>구글 시트 관리</span>
            <h3 id="admin-google-sheet-dialog-title">상세 설정</h3>
          </div>
          <button className={styles.gptKeyDialogCloseButton} type="button" onClick={onClose} disabled={isSaving || isDeleting} aria-label="닫기">
            x
          </button>
        </header>

        <form id={formId} className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <label className={styles.createField}>
            <span>회사</span>
            <select value={companyUuid} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setCompanyUuid(event.target.value)} required>
              {companies.length === 0 ? <option value="">선택 가능한 회사 없음</option> : null}
              {companies.map((company: CompanySummary) : React.JSX.Element => (
                <option key={company.uuid} value={company.uuid}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.createField}>
            <span>이름</span>
            <input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setName(event.target.value)} />
          </label>
          <label className={styles.createField}>
            <span>용도</span>
            <select value={purpose} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setPurpose(event.target.value as AdminGoogleSheetPurpose)}>
              {GOOGLE_SHEET_PURPOSE_OPTIONS.map((option: { value: AdminGoogleSheetPurpose; label: string; }) : React.JSX.Element => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.createActiveField}>
            <AdminActiveSwitch checked={isActive} onChange={setIsActive} />
          </div>
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>시트 주소</span>
            <input value={spreadsheetUrl} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setSpreadsheetUrl(event.target.value)} />
          </label>
          <AdminGoogleSheetKeyDropzone
            fileName={serviceAccountFileName}
            serviceAccountEmail={serviceAccountEmail || config.serviceAccountEmail}
            disabled={isSaving}
            onLoaded={(loaded: LoadedGoogleSheetKey) : void => {
              setServiceAccountFileName(loaded.fileName)
              setServiceAccountKeyJson(loaded.keyJson)
              setServiceAccountEmail(loaded.serviceAccountEmail)
              setErrorMessage(null)
            }}
            onClear={() : void => {
              setServiceAccountFileName('')
              setServiceAccountKeyJson('')
              setServiceAccountEmail('')
            }}
            onError={setErrorMessage}
          />
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>비고</span>
            <input value={note} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNote(event.target.value)} />
          </label>
        </form>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <LoadingSpinner size="inline" label="삭제 중" /> : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button className={styles.createButton} type="submit" form={formId} disabled={!canSubmitCompany || !isDirty || isSaving}>
            {isSaving ? <LoadingSpinner size="inline" label="변경 중" /> : '변경'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={isSaving || isDeleting}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}

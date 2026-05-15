import { useState, type FormEvent } from 'react'
import { deleteAdminGoogleSheetConfig, updateAdminGoogleSheetConfig } from '../api'
import type { AdminGoogleSheetConfigSummary, AdminGoogleSheetPurpose } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminGoogleSheetKeyDropzone } from './AdminGoogleSheetKeyDropzone'
import { GOOGLE_SHEET_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminGoogleSheetDialogProps {
  config: AdminGoogleSheetConfigSummary
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
}

const formId = 'admin-google-sheet-detail-form'

export function AdminGoogleSheetDialog({ config, onClose, onChanged, onDeleted }: AdminGoogleSheetDialogProps) {
  const { showToast } = useAppToast()
  const [name, setName] = useState(config.name)
  const [purpose, setPurpose] = useState<AdminGoogleSheetPurpose>(config.purpose)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(config.spreadsheetUrl)
  const [isActive, setIsActive] = useState(config.isActive)
  const [note, setNote] = useState(config.note ?? '')
  const [serviceAccountKeyJson, setServiceAccountKeyJson] = useState('')
  const [serviceAccountFileName, setServiceAccountFileName] = useState('')
  const [serviceAccountEmail, setServiceAccountEmail] = useState('')
  const [rowMessage, setRowMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const hasNewKey = serviceAccountKeyJson.trim().length > 0
  const isDirty =
    name !== config.name ||
    purpose !== config.purpose ||
    spreadsheetUrl !== config.spreadsheetUrl ||
    isActive !== config.isActive ||
    note !== (config.note ?? '') ||
    hasNewKey

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)

    try {
      await updateAdminGoogleSheetConfig({
        uuid: config.uuid,
        name,
        purpose,
        spreadsheetUrl,
        isActive,
        note,
        serviceAccountKeyJson: hasNewKey ? serviceAccountKeyJson : undefined,
      })
      await onChanged()
      if (hasNewKey) {
        setServiceAccountKeyJson('')
        setServiceAccountFileName('')
        setServiceAccountEmail('')
      }
      setRowMessage(hasNewKey ? '변경됨 · JSON 키 교체됨' : '변경됨')
      showToast(hasNewKey ? '구글 시트 설정과 JSON 키를 변경했습니다.' : '구글 시트 설정을 변경했습니다.')
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setErrorMessage(null)
    setRowMessage(null)

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setRowMessage('삭제 버튼을 한 번 더 누르면 구글 시트 설정이 삭제됩니다.')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAdminGoogleSheetConfig(config.uuid)
      await onDeleted()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-google-sheet-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>구글 시트 관리</span>
            <h3 id="admin-google-sheet-dialog-title">상세 설정</h3>
          </div>
          <button className={styles.gptKeyDialogCloseButton} type="button" onClick={onClose} aria-label="닫기">
            x
          </button>
        </header>

        <form id={formId} className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <label className={styles.createField}>
            <span>이름</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className={styles.createField}>
            <span>용도</span>
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as AdminGoogleSheetPurpose)}>
              {GOOGLE_SHEET_PURPOSE_OPTIONS.map((option) => (
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
            <input value={spreadsheetUrl} onChange={(event) => setSpreadsheetUrl(event.target.value)} />
          </label>
          <AdminGoogleSheetKeyDropzone
            fileName={serviceAccountFileName}
            serviceAccountEmail={serviceAccountEmail || config.serviceAccountEmail}
            disabled={isSaving}
            onLoaded={(loaded) => {
              setServiceAccountFileName(loaded.fileName)
              setServiceAccountKeyJson(loaded.keyJson)
              setServiceAccountEmail(loaded.serviceAccountEmail)
              setErrorMessage(null)
            }}
            onClear={() => {
              setServiceAccountFileName('')
              setServiceAccountKeyJson('')
              setServiceAccountEmail('')
            }}
            onError={setErrorMessage}
          />
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>비고</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </form>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <LoadingSpinner size="inline" label="삭제 중" /> : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button className={styles.createButton} type="submit" form={formId} disabled={!isDirty || isSaving}>
            {isSaving ? <LoadingSpinner size="inline" label="변경 중" /> : '변경'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
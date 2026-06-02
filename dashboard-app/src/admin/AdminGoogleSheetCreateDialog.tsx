import { useState, type FormEvent } from 'react'
import { createAdminGoogleSheetConfig } from '../api'
import type { AdminGoogleSheetPurpose } from '../api'
import type { CompanySummary } from '../api/types/company'
import { useAppToast } from '../components/AppToastContext'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminCreateDialogShell } from './AdminCreateDialogShell'
import { AdminGoogleSheetKeyDropzone } from './AdminGoogleSheetKeyDropzone'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { GOOGLE_SHEET_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminGoogleSheetCreateDialogProps {
  companies: CompanySummary[]
  defaultCompanyUuid: string | null | undefined
  onClose: () => void
  onCreated: () => Promise<void>
}

const formId = 'admin-google-sheet-create-form'

export function AdminGoogleSheetCreateDialog({
  companies,
  defaultCompanyUuid,
  onClose,
  onCreated,
}: AdminGoogleSheetCreateDialogProps) {
  const { showToast } = useAppToast()
  const initialCompanyUuid = companies.some((company) => company.uuid === defaultCompanyUuid)
    ? defaultCompanyUuid ?? ''
    : companies[0]?.uuid ?? ''
  const [companyUuid, setCompanyUuid] = useState(
    initialCompanyUuid,
  )
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState<AdminGoogleSheetPurpose>('db-schema')
  const [serviceAccountKeyJson, setServiceAccountKeyJson] = useState('')
  const [serviceAccountFileName, setServiceAccountFileName] = useState('')
  const [serviceAccountEmail, setServiceAccountEmail] = useState('')
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [note, setNote] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const canSubmitCompany = companies.length > 0 && companyUuid.trim().length > 0

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!canSubmitCompany) {
      setErrorMessage('회사를 선택해야 합니다.')
      return
    }

    setIsCreating(true)

    try {
      await createAdminGoogleSheetConfig({
        companyUuid,
        name,
        purpose,
        serviceAccountKeyJson,
        spreadsheetUrl,
        isActive,
        note,
      })
      const refreshWarningMessage = await refreshAfterAdminMutation(onCreated)
      showToast('구글 시트 설정을 추가했습니다.')
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AdminCreateDialogShell
      eyebrow="구글 시트 관리"
      title="구글 시트 설정 추가"
      formId={formId}
      submitLabel="구글 시트 추가"
      submittingLabel="추가 중"
      isSubmitting={isCreating}
      errorMessage={errorMessage}
      onClose={onClose}
      onSubmit={handleCreate}
    >
      <label className={styles.createField}>
        <span>회사</span>
        <select value={companyUuid} onChange={(event) => setCompanyUuid(event.target.value)} required>
          {companies.length === 0 ? <option value="">선택 가능한 회사 없음</option> : null}
          {companies.map((company) => (
            <option key={company.uuid} value={company.uuid}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.createField}>
        <span>이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="DB 설계 시트" />
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
        <input
          value={spreadsheetUrl}
          onChange={(event) => setSpreadsheetUrl(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
        />
      </label>
      <AdminGoogleSheetKeyDropzone
        fileName={serviceAccountFileName}
        serviceAccountEmail={serviceAccountEmail}
        disabled={isCreating}
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
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="용도나 관리 위치" />
      </label>
    </AdminCreateDialogShell>
  )
}

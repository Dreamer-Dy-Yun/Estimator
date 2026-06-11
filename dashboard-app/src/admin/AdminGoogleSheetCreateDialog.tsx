import type { LoadedGoogleSheetKey } from './AdminGoogleSheetKeyDropzone'
import { useState } from 'react'
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

export interface AdminGoogleSheetCreateDialogProps {
  companies: CompanySummary[]
  defaultCompanyUuid: string | null | undefined
  onClose: () => void
  onCreated: () => Promise<void>
}

const formId = 'admin-google-sheet-create-form' as const

export function AdminGoogleSheetCreateDialog({
  companies,
  defaultCompanyUuid,
  onClose,
  onCreated,
}: AdminGoogleSheetCreateDialogProps) : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const initialCompanyUuid: string = companies.some((company: CompanySummary) : boolean => company.uuid === defaultCompanyUuid)
    ? defaultCompanyUuid ?? ''
    : companies[0]?.uuid ?? ''
  const [companyUuid, setCompanyUuid]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(
    initialCompanyUuid,
  )
  const [name, setName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [purpose, setPurpose]: [AdminGoogleSheetPurpose, React.Dispatch<React.SetStateAction<AdminGoogleSheetPurpose>>] = useState<AdminGoogleSheetPurpose>('db-schema')
  const [serviceAccountKeyJson, setServiceAccountKeyJson]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [serviceAccountFileName, setServiceAccountFileName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [serviceAccountEmail, setServiceAccountEmail]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [spreadsheetUrl, setSpreadsheetUrl]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [isActive, setIsActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [note, setNote]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isCreating, setIsCreating]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const canSubmitCompany: boolean = companies.length > 0 && companyUuid.trim().length > 0

  const handleCreate: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
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
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onCreated)
      showToast('구글 시트 설정을 추가했습니다.')
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error: unknown) {
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
        <input value={name} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setName(event.target.value)} placeholder="DB 설계 시트" />
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
        <input
          value={spreadsheetUrl}
          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setSpreadsheetUrl(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
        />
      </label>
      <AdminGoogleSheetKeyDropzone
        fileName={serviceAccountFileName}
        serviceAccountEmail={serviceAccountEmail}
        disabled={isCreating}
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
        <input value={note} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNote(event.target.value)} placeholder="용도나 관리 위치" />
      </label>
    </AdminCreateDialogShell>
  )
}

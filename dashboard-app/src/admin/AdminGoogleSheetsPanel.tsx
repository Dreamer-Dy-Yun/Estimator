import { useEffect, useState, type FormEvent } from 'react'
import { createAdminGoogleSheetConfig, deleteAdminGoogleSheetConfig, getAdminGoogleSheetConfigs } from '../api'
import type {
  AdminGoogleSheetAccessMode,
  AdminGoogleSheetConfigSummary,
  AdminGoogleSheetPurpose,
  AdminGoogleSheetShareRole,
} from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminGoogleSheetRow } from './AdminGoogleSheetRow'
import {
  GOOGLE_SHEET_ACCESS_MODE_OPTIONS,
  GOOGLE_SHEET_PURPOSE_OPTIONS,
  GOOGLE_SHEET_SHARE_ROLE_OPTIONS,
  getErrorMessage,
} from './adminHelpers'
import styles from './AdminPage.module.css'

const DEFAULT_RANGE = 'SKU!A1:Z'

export function AdminGoogleSheetsPanel() {
  const { showToast } = useAppToast()
  const [configs, setConfigs] = useState<AdminGoogleSheetConfigSummary[]>([])
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState<AdminGoogleSheetPurpose>('db-schema')
  const [serviceAccountEmail, setServiceAccountEmail] = useState('')
  const [serviceAccountRole, setServiceAccountRole] = useState<AdminGoogleSheetShareRole>('viewer')
  const [serviceAccountKeyJson, setServiceAccountKeyJson] = useState('')
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [sheetRange, setSheetRange] = useState(DEFAULT_RANGE)
  const [accessMode, setAccessMode] = useState<AdminGoogleSheetAccessMode>('readonly')
  const [isActive, setIsActive] = useState(true)
  const [note, setNote] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    getAdminGoogleSheetConfigs()
      .then((nextConfigs) => {
        if (alive) setConfigs(nextConfigs)
      })
      .catch((error) => {
        if (alive) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const reloadConfigs = async () => {
    const nextConfigs = await getAdminGoogleSheetConfigs()
    setConfigs(nextConfigs)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setIsCreating(true)
    try {
      await createAdminGoogleSheetConfig({
        name,
        purpose,
        serviceAccountEmail,
        serviceAccountRole,
        serviceAccountKeyJson,
        spreadsheetUrl,
        sheetRange,
        accessMode,
        isActive,
        note,
      })
      await reloadConfigs()
      setName('')
      setServiceAccountEmail('')
      setServiceAccountKeyJson('')
      setSpreadsheetUrl('')
      setSheetRange(DEFAULT_RANGE)
      setIsActive(true)
      setNote('')
      showToast('구글 시트 설정을 추가했습니다.')
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (config: AdminGoogleSheetConfigSummary) => {
    if (!window.confirm(`${config.name} 설정을 제거할까요?`)) return
    try {
      await deleteAdminGoogleSheetConfig(config.uuid)
      await reloadConfigs()
      showToast('구글 시트 설정을 삭제했습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>구글 시트</h2>
          <p>{configs.length}개</p>
        </div>
      </div>

      <form className={styles.googleSheetCreateForm} onSubmit={handleCreate}>
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
        <label className={styles.createField}>
          <span>권한</span>
          <select
            value={serviceAccountRole}
            onChange={(event) => setServiceAccountRole(event.target.value as AdminGoogleSheetShareRole)}
          >
            {GOOGLE_SHEET_SHARE_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.createField}>
          <span>접근</span>
          <select value={accessMode} onChange={(event) => setAccessMode(event.target.value as AdminGoogleSheetAccessMode)}>
            {GOOGLE_SHEET_ACCESS_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.createField} ${styles.googleSheetWideField}`}>
          <span>서비스 계정</span>
          <input
            value={serviceAccountEmail}
            onChange={(event) => setServiceAccountEmail(event.target.value)}
            placeholder="service-account@project.iam.gserviceaccount.com"
          />
        </label>
        <label className={`${styles.createField} ${styles.googleSheetWideField}`}>
          <span>시트 주소</span>
          <input
            value={spreadsheetUrl}
            onChange={(event) => setSpreadsheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
          />
        </label>
        <label className={styles.createField}>
          <span>범위</span>
          <input value={sheetRange} onChange={(event) => setSheetRange(event.target.value)} placeholder={DEFAULT_RANGE} />
        </label>
        <div className={styles.createActiveField}>
          <AdminActiveSwitch checked={isActive} onChange={setIsActive} />
        </div>
        <label className={`${styles.createField} ${styles.googleSheetKeyField}`}>
          <span>서비스 계정 JSON 키</span>
          <textarea
            value={serviceAccountKeyJson}
            onChange={(event) => setServiceAccountKeyJson(event.target.value)}
            placeholder='{"type":"service_account", ...}'
          />
        </label>
        <label className={`${styles.createField} ${styles.googleSheetCreateNote}`}>
          <span>비고</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="용도나 관리 위치" />
        </label>
        <button className={styles.createButton} type="submit" disabled={isCreating}>
          {isCreating ? <LoadingSpinner size="inline" label="추가 중" /> : '구글 시트 추가'}
        </button>
        {createErrorMessage ? <p className={styles.createError}>{createErrorMessage}</p> : null}
      </form>

      <div className={styles.googleSheetTableHeader} aria-hidden="true">
        <span>이름</span>
        <span>용도</span>
        <span>서비스 계정</span>
        <span>시트</span>
        <span>권한/접근</span>
        <span>상태</span>
        <span>작업</span>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <LoadingSpinner label="구글 시트 설정 로딩 중" />
        </div>
      ) : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? (
        <div className={styles.userList}>
          {configs.map((config) => (
            <AdminGoogleSheetRow key={config.uuid} config={config} onDelete={handleDelete} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

import type { CompanySummary } from '../api'
import { useId } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getCompanyOptionLabel } from './hooks/useSelfCompanyLabel'
import styles from './companySelector.module.css'

const EMPTY_LABEL = '회사 미선택' as const

function getErrorMessage(error: string | null) : string {
  if (!error) return ''
  return error
}

export function CompanySelector() : React.JSX.Element {
  const selectId: string = useId()
  const {
    companies,
    selectedCompanyUuid,
    selectedCompany,
    isCompanyLoading,
    companyError,
    selectCompany,
  }: ReturnType<typeof useAuth> = useAuth()
  const errorMessage: string = getErrorMessage(companyError)
  const selectedValue: string = selectedCompanyUuid ?? selectedCompany?.uuid ?? ''
  const hasInvalidCompany: boolean = companies.some((company: CompanySummary) : boolean => !company.uuid)

  const handleChange: (event: React.ChangeEvent<HTMLSelectElement>) => void = (event: React.ChangeEvent<HTMLSelectElement>) : void => {
    const nextCompanyUuid: string = event.target.value

    if (!nextCompanyUuid || nextCompanyUuid === selectedValue) return

    selectCompany(nextCompanyUuid)
  }

  if (isCompanyLoading) {
    return (
      <div className={styles.selectorShell} role="status" aria-live="polite">
        <div className={`${styles.control} ${styles.muted}`}>
          <span className={styles.label}>회사</span>
          <span className={styles.value}>불러오는 중</span>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className={styles.selectorShell} role="status" aria-live="polite">
        <div className={`${styles.control} ${styles.error}`} title={errorMessage}>
          <span className={styles.label}>회사</span>
          <span className={styles.value}>{errorMessage}</span>
        </div>
      </div>
    )
  }

  if (hasInvalidCompany) {
    return (
      <div className={styles.selectorShell} role="status" aria-live="polite">
        <div className={`${styles.control} ${styles.error}`}>
          <span className={styles.label}>회사</span>
          <span className={styles.value}>회사 정보를 확인할 수 없습니다</span>
        </div>
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className={styles.selectorShell} role="status" aria-live="polite">
        <div className={`${styles.control} ${styles.muted}`}>
          <span className={styles.label}>회사</span>
          <span className={styles.value}>{EMPTY_LABEL}</span>
        </div>
      </div>
    )
  }

  if (companies.length === 1) {
    const company: CompanySummary = companies[0]
    const companyLabel: string = getCompanyOptionLabel(company) || EMPTY_LABEL

    return (
      <div className={styles.selectorShell}>
        <div className={styles.control} title={companyLabel}>
          <span className={styles.label}>회사</span>
          <span className={styles.value}>{companyLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.selectorShell}>
      <div className={styles.control}>
        <label className={styles.label} htmlFor={selectId}>
          회사
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={selectedValue}
          onChange={handleChange}
          aria-label="회사 선택"
        >
          {!selectedValue ? (
            <option value="" disabled>
              회사를 선택하세요
            </option>
          ) : null}
          {companies.map((company: CompanySummary) : React.JSX.Element => {
            return (
              <option key={company.uuid} value={company.uuid}>
                {getCompanyOptionLabel(company)}
              </option>
            )
          })}
        </select>
      </div>
    </div>
  )
}

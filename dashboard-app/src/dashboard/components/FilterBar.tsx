/**
 * 필터 한 줄 UI. `kind: 'listCombo'`는 공통 `FilterListCombo`로만 렌더링(중복 구현 없음).
 */
import { useId, type ReactNode } from 'react'
import { FilterListCombo } from './FilterListCombo'
import styles from './common.module.css'

export { FilterListCombo } from './FilterListCombo'

type FilterField = {
  label: string
  /** `listCombo`: 자유 입력 + `options` 제안 — 내부적으로 `FilterListCombo` 단일 구현 사용. */
  kind: 'input' | 'select' | 'listCombo'
  inputType?: 'text' | 'date'
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  /** `select`: 선택지. `listCombo`: 제안 목록(부분 일치 필터). */
  options?: string[]
}

type FilterBarProps = {
  title?: string
  fields: FilterField[]
  extraContent?: ReactNode
}

export function FilterBar({ title = '필터', fields, extraContent }: FilterBarProps) {
  const barId = useId()
  return (
    <div className={styles.filterRow}>
      <div className={styles.card}>
        {title ? <div className={styles.cardTitle}>{title}</div> : null}
        <div className={`${styles.filter} ${styles.filterHorizontal}`}>
          {fields.map((field, index) => {
            const inputId = `${barId}-in-${index}`
            return (
              <div key={field.label} className={styles.field}>
                <label htmlFor={inputId}>{field.label}</label>
                {field.kind === 'select' ? (
                  <select
                    id={inputId}
                    value={field.value ?? field.defaultValue ?? ''}
                    onChange={(e) => field.onChange?.(e.target.value)}
                  >
                    {(field.options ?? [field.defaultValue ?? '']).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.kind === 'listCombo' ? (
                  <FilterListCombo
                    inputId={inputId}
                    value={field.value ?? field.defaultValue ?? ''}
                    onChange={(v) => field.onChange?.(v)}
                    options={field.options ?? []}
                    inputType={field.inputType ?? 'text'}
                  />
                ) : (
                  <input
                    id={inputId}
                    type={field.inputType ?? 'text'}
                    value={field.value ?? field.defaultValue ?? ''}
                    onChange={(e) => field.onChange?.(e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
        {extraContent}
      </div>
    </div>
  )
}

import { useId, type ReactNode } from 'react'
import type { FilterField } from '../model/filterField'
import { FilterListCombo } from './FilterListCombo'
import styles from './common.module.css'

type FilterBarProps = {
  title?: string
  fields: FilterField[]
  filterEndContent?: ReactNode
  extraContent?: ReactNode
  filterClassName?: string
}

export function FilterBar({ title = '필터', fields, filterEndContent, extraContent, filterClassName }: FilterBarProps) {
  const barId = useId()
  return (
    <div className={styles.filterRow}>
      <div className={styles.card}>
        {title ? <div className={styles.cardTitle}>{title}</div> : null}
        <div className={`${styles.filter} ${filterClassName ?? styles.filterHorizontal}`}>
          {fields.map((field, index) => {
            const inputId = `${barId}-in-${index}`
            const value = field.displayValue ?? field.value ?? field.defaultValue ?? ''
            const options = field.options ?? [field.defaultValue ?? '']
            const selectOptions = value !== '' || options.includes('') ? options : ['', ...options]
            return (
              <div key={field.label} className={`${styles.field} ${field.disabled ? styles.fieldDisabled : ''}`}>
                <label htmlFor={inputId}>{field.label}</label>
                {field.kind === 'select' ? (
                  <select id={inputId} value={value} disabled={field.disabled} onChange={(event) => field.onChange?.(event.target.value)}>
                    {selectOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.kind === 'listCombo' ? (
                  <FilterListCombo key={`${inputId}-${field.disabled ? 'disabled' : 'enabled'}`} inputId={inputId} value={value} onChange={(next) => field.onChange?.(next)} options={field.options ?? []} inputType={field.inputType ?? 'text'} disabled={field.disabled} />
                ) : (
                  <input id={inputId} type={field.inputType ?? 'text'} value={value} disabled={field.disabled} onChange={(event) => field.onChange?.(event.target.value)} />
                )}
              </div>
            )
          })}
          {filterEndContent}
        </div>
        {extraContent}
      </div>
    </div>
  )
}

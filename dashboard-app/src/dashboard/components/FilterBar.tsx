import type { ReactNode } from 'react'
import styles from './common.module.css'

type FilterField = {
  label: string
  kind: 'input' | 'select'
  inputType?: 'text' | 'date'
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  options?: string[]
}

type FilterBarProps = {
  title?: string
  fields: FilterField[]
  extraContent?: ReactNode
}

export function FilterBar({ title = '필터', fields, extraContent }: FilterBarProps) {
  return (
    <div className={styles.filterRow}>
      <div className={styles.card}>
        {title ? <div className={styles.cardTitle}>{title}</div> : null}
        <div className={`${styles.filter} ${styles.filterHorizontal}`}>
          {fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <label>{field.label}</label>
              {field.kind === 'select' ? (
                <select
                  value={field.value ?? field.defaultValue ?? ''}
                  onChange={(e) => field.onChange?.(e.target.value)}
                >
                  {(field.options ?? [field.defaultValue ?? '']).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.inputType ?? 'text'}
                  value={field.value ?? field.defaultValue ?? ''}
                  onChange={(e) => field.onChange?.(e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        {extraContent}
      </div>
    </div>
  )
}

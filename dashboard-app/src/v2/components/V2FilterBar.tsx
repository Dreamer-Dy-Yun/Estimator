import type { ReactNode } from 'react'
import styles from './v2-common.module.css'

type V2FilterField = {
  label: string
  type: 'input' | 'select'
  inputType?: 'text' | 'date'
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  options?: string[]
}

type V2FilterBarProps = {
  title?: string
  fields: V2FilterField[]
  extraContent?: ReactNode
}

export function V2FilterBar({ title = '필터', fields, extraContent }: V2FilterBarProps) {
  return (
    <div className={styles.filterRow}>
      <div className={styles.card}>
        {title ? <div className={styles.cardTitle}>{title}</div> : null}
        <div className={`${styles.filter} ${styles.filterHorizontal}`}>
          {fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <label>{field.label}</label>
              {field.type === 'select' ? (
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

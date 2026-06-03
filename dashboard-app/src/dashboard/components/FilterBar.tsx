import { useId } from 'react'
import type { FilterField } from '../model/filterField'
import { FilterListCombo } from './FilterListCombo'
import styles from './common.module.css'

export type FilterBarProps = {
  title?: string
  fields: FilterField[]
  filterEndContent?: React.ReactNode
  extraContent?: React.ReactNode
  filterClassName?: string
}

export type FilterFieldGridProps = {
  fields: FilterField[]
  filterEndContent?: React.ReactNode
  filterClassName?: string
}

export function FilterFieldGrid({ fields, filterEndContent, filterClassName }: FilterFieldGridProps) : React.JSX.Element {
  const barId: string = useId()
  return (
    <div className={`${styles.filter} ${filterClassName ?? styles.filterHorizontal}`}>
      {fields.map((field: FilterField, index: number) : React.JSX.Element => {
        const inputId: string = `${barId}-in-${index}`
        const value: string = field.displayValue ?? field.value ?? field.defaultValue ?? ''
        const options: string[] = field.options ?? [field.defaultValue ?? '']
        const selectOptions: string[] = value !== '' || options.includes('') ? options : ['', ...options]
        return (
          <div key={field.label} className={`${styles.field} ${field.disabled ? styles.fieldDisabled : ''}`}>
            <label htmlFor={inputId}>{field.label}</label>
            {field.kind === 'select' ? (
              <select id={inputId} value={value} disabled={field.disabled} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void | undefined => field.onChange?.(event.target.value)}>
                {selectOptions.map((option: string) : React.JSX.Element => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : field.kind === 'listCombo' ? (
              <FilterListCombo key={`${inputId}-${field.disabled ? 'disabled' : 'enabled'}`} inputId={inputId} value={value} onChange={(next: string) : void | undefined => field.onChange?.(next)} options={field.options ?? []} inputType={field.inputType ?? 'text'} disabled={field.disabled} />
            ) : (
              <input id={inputId} type={field.inputType ?? 'text'} value={value} disabled={field.disabled} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void | undefined => field.onChange?.(event.target.value)} />
            )}
          </div>
        )
      })}
      {filterEndContent}
    </div>
  )
}

export function FilterBar({ title = '필터', fields, filterEndContent, extraContent, filterClassName }: FilterBarProps) : React.JSX.Element {
  return (
    <div className={styles.filterRow}>
      <div className={styles.card}>
        {title ? <div className={styles.cardTitle}>{title}</div> : null}
        <FilterFieldGrid fields={fields} filterEndContent={filterEndContent} filterClassName={filterClassName} />
        {extraContent}
      </div>
    </div>
  )
}

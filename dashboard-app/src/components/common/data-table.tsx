import type { ReactNode } from 'react'
import styles from './data-table.module.css'

export type Col<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render: (row: T) => ReactNode }

export const DataTable = <T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: Array<Col<T>>
  rows: T[]
  onRowClick?: (row: T) => void
}) => (
  <div className={styles.wrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={styles[c.align ?? 'left']}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} onClick={() => onRowClick?.(r)} className={onRowClick ? styles.clickable : ''}>
            {columns.map((c) => (
              <td key={c.key} className={styles[c.align ?? 'left']}>{c.render(r)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

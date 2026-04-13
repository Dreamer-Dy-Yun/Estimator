import type { ReactNode } from 'react'
import styles from './v2-common.module.css'

type V2KpiItem = {
  label: string
  value: ReactNode
}

type V2KpiGridProps = {
  items: V2KpiItem[]
  stacked?: boolean
}

export function V2KpiGrid({ items, stacked = false }: V2KpiGridProps) {
  return (
    <div className={`${styles.kpiGrid} ${stacked ? styles.kpiStack : ''}`.trim()}>
      {items.map((item) => (
        <div key={item.label} className={styles.kpi}>
          <div className={styles.kpiLabel}>{item.label}</div>
          <div className={styles.kpiValue}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

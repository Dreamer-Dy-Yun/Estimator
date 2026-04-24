import type { ReactNode } from 'react'
import styles from './common.module.css'

type KpiItem = {
  label: string
  value: ReactNode
}

type KpiGridProps = {
  items: KpiItem[]
  stacked?: boolean
}

export function KpiGrid({ items, stacked = false }: KpiGridProps) {
  return (
    <div className={`${styles.kpiGrid} ${stacked ? styles.kpiStack : ''}`.trim()}>
      {items.map((item) => (
        <div key={item.label} className={`${styles.kpi} ${styles.kpiMetricCard}`.trim()}>
          <div className={styles.kpiLabel}>{item.label}</div>
          <div className={styles.kpiValue}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

import styles from './common.module.css'

export type KpiItem = {
  id?: string
  label: React.ReactNode
  value: React.ReactNode
  unit?: React.ReactNode
}

export type KpiGridProps = {
  items: KpiItem[]
  stacked?: boolean
}

export function KpiGrid({ items, stacked = false }: KpiGridProps) : React.JSX.Element {
  return (
    <div className={`${styles.kpiGrid} ${stacked ? styles.kpiStack : ''}`.trim()}>
      {items.map((item: KpiItem) : React.JSX.Element => (
        <div key={item.id ?? String(item.label)} className={`${styles.kpi} ${styles.kpiMetricCard}`.trim()}>
          <div className={styles.kpiLabel}>{item.label}</div>
          <div className={styles.kpiValue}>
            <span className={styles.kpiValueMain}>{item.value}</span>
            {item.unit ? <span className={styles.kpiUnit}>{item.unit}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

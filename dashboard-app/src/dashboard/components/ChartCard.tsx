import type { PropsWithChildren } from 'react'
import styles from './common.module.css'

type ChartCardProps = PropsWithChildren<{
  title: string
  className?: string
}>

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`.trim()}>
      <div className={styles.cardTitle}>{title}</div>
      {children}
    </div>
  )
}

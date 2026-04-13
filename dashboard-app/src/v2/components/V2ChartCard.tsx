import type { PropsWithChildren } from 'react'
import styles from './v2-common.module.css'

type V2ChartCardProps = PropsWithChildren<{
  title: string
  className?: string
}>

export function V2ChartCard({ title, children, className }: V2ChartCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`.trim()}>
      <div className={styles.cardTitle}>{title}</div>
      {children}
    </div>
  )
}

import type { PropsWithChildren, ReactNode } from 'react'
import styles from './common.module.css'

type ChartCardProps = PropsWithChildren<{
  title: string
  className?: string
  titleAction?: ReactNode
}>

export function ChartCard({ title, children, className, titleAction }: ChartCardProps) {
  return (
    <div className={`${styles.card} ${className ?? ''}`.trim()}>
      <div className={styles.chartCardTitleRow}>
        <div className={styles.cardTitle}>{title}</div>
        {titleAction}
      </div>
      {children}
    </div>
  )
}

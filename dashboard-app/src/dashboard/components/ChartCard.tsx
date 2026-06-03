import type { PropsWithChildren } from 'react'
import styles from './common.module.css'

export type ChartCardProps = PropsWithChildren<{
  title: string
  className?: string
  titleAction?: React.ReactNode
}>

export function ChartCard({ title, children, className, titleAction }: ChartCardProps) : React.JSX.Element {
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

import styles from './common.module.css'

type PageHeaderProps = {
  title: string
  badge?: string
}

export function PageHeader({ title, badge }: PageHeaderProps) {
  return (
    <div className={styles.headline}>
      <h1>{title}</h1>
      {badge ? <span className={styles.badge}>{badge}</span> : null}
    </div>
  )
}

import styles from './v2-common.module.css'

type V2PageHeaderProps = {
  title: string
  badge?: string
}

export function V2PageHeader({ title, badge }: V2PageHeaderProps) {
  return (
    <div className={styles.headline}>
      <h1>{title}</h1>
      {badge ? <span className={styles.badge}>{badge}</span> : null}
    </div>
  )
}

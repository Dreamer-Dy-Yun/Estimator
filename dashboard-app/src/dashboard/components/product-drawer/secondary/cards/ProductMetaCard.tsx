import type { ProductPrimarySummary } from '../../../../../types'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

type Props = {
  primary: ProductPrimarySummary
}

type MetaItemProps = {
  label: string
  value: string
  className?: string
}

function MetaItem({ label, value, className }: MetaItemProps) {
  return (
    <div className={className ? `${styles.metaItem} ${className}` : styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue} title={value}>{value}</span>
    </div>
  )
}

export function ProductMetaCard({ primary }: Props) {
  return (
    <div className={`${styles.card} ${styles.metaCard}`}>
      <div className={styles.metaGrid}>
        <MetaItem label={KO.labelBrand} value={primary.brand} />
        <MetaItem label={KO.labelCategory} value={primary.category} />
        <MetaItem label={KO.labelCode} value={primary.code} />
        <MetaItem label={KO.labelColorCode} value={primary.colorCode} />
        <MetaItem label={KO.labelProductName} value={primary.productName} className={styles.metaItemProductName} />
      </div>
    </div>
  )
}

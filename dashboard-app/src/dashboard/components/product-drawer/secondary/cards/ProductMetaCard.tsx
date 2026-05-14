import type { ProductPrimarySummary } from '../../../../../types'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

type Props = {
  primary: ProductPrimarySummary
}

export function ProductMetaCard({ primary }: Props) {
  return (
    <div className={`${styles.card} ${styles.metaCard}`}>
      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{KO.labelBrand}</span>
          <span className={styles.metaValue}>{primary.brand}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{KO.labelCategory}</span>
          <span className={styles.metaValue}>{primary.category}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{KO.labelCode}</span>
          <span className={styles.metaValue}>{primary.code}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{KO.labelColorCode}</span>
          <span className={styles.metaValue}>{primary.colorCode}</span>
        </div>
        <div className={`${styles.metaItem} ${styles.metaItemProductName}`}>
          <span className={styles.metaLabel}>{KO.labelProductName}</span>
          <span className={styles.metaValue}>{primary.productName}</span>
        </div>
      </div>
    </div>
  )
}

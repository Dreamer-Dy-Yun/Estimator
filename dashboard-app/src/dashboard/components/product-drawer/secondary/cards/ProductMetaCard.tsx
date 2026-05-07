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
          <span className={styles.metaLabel}>{KO.labelProductCode}</span>
          <span className={styles.metaValue}>{primary.productCode}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{KO.labelProductName}</span>
          <span className={styles.metaValue}>{primary.name}</span>
        </div>
      </div>
    </div>
  )
}

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProductDetail } from '../../types'
import { c, won } from '../../utils/format'
import styles from './v2-common.module.css'

export const ProductInsightDrawer = ({
  detail,
  onClose,
}: {
  detail: ProductDetail | null
  onClose: () => void
}) => {
  if (!detail) return null

  return (
    <aside className={styles.drawer}>
      <div className={styles.drawerHead}>
        <strong>상품 인사이트</strong>
        <button onClick={onClose}>닫기</button>
      </div>
      <div className={styles.drawerBody}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{detail.name}</div>
          <div>브랜드: {detail.brand}</div>
          <div>카테고리: {detail.category}</div>
          <div>품번: {detail.type}</div>
        </div>
        <div className={styles.kpiGrid}>
          <div className={styles.kpi}><div className={styles.kpiLabel}>자사 판매가</div><div className={styles.kpiValue}>{won(detail.selfPrice)}</div></div>
          <div className={styles.kpi}><div className={styles.kpiLabel}>경쟁사 판매가</div><div className={styles.kpiValue}>{won(detail.competitorPrice)}</div></div>
          <div className={styles.kpi}><div className={styles.kpiLabel}>자사 판매량</div><div className={styles.kpiValue}>{c(detail.selfQty)}</div></div>
          <div className={styles.kpi}><div className={styles.kpiLabel}>추천 오더량</div><div className={styles.kpiValue}>{c(detail.recommendedOrderQty)}</div></div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>재고 추이</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={detail.stockTrend}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line dataKey="stock" stroke="#0f172a" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </aside>
  )
}

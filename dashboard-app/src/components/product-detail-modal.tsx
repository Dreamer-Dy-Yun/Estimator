import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProductDetail } from '../types'
import { c, won } from '../utils/format'
import styles from './product-detail-modal.module.css'

export const ProductDetailModal = ({
  open,
  detail,
  onClose,
}: {
  open: boolean
  detail: ProductDetail | null
  onClose: () => void
}) => {
  if (!open) return null
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h3>상품 상세 분석</h3>
          <button onClick={onClose}>닫기</button>
        </header>
        {!detail ? <div className={styles.body}>불러오는 중...</div> : (
          <div className={styles.body}>
            <div className={styles.grid}>
              <div className={styles.card}>브랜드: {detail.brand}</div>
              <div className={styles.card}>카테고리: {detail.category}</div>
              <div className={styles.card}>품번: {detail.type}</div>
              <div className={styles.card}>상품명: {detail.name}</div>
              <div className={styles.card}>자사 평균 판매가: {won(detail.selfPrice)}</div>
              <div className={styles.card}>크림 평균 판매가: {won(detail.competitorPrice)}</div>
              <div className={styles.card}>자사 판매량: {c(detail.selfQty)}</div>
              <div className={styles.card}>크림 판매량: {c(detail.competitorQty)}</div>
              <div className={styles.card}>추천 오더량: {c(detail.recommendedOrderQty)}</div>
            </div>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={detail.stockTrend}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="stock" stroke="#233750" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className={styles.sizeTable}>
              <thead><tr><th>사이즈</th>{detail.sizeMix.map((s) => <th key={s.size}>{s.size}</th>)}</tr></thead>
              <tbody>
                <tr><th>자사</th>{detail.sizeMix.map((s) => <td key={`${s.size}-self`}>{s.selfRatio}%</td>)}</tr>
                <tr><th>크림</th>{detail.sizeMix.map((s) => <td key={`${s.size}-comp`}>{s.competitorRatio}%</td>)}</tr>
                <tr><th>오더량 확정</th>{detail.sizeMix.map((s) => <td key={`${s.size}-qty`}>{c(s.confirmedQty)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

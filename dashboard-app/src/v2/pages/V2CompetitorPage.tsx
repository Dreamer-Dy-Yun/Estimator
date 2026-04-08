import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { CompetitorRow, ProductDetail } from '../../types'
import { c, won } from '../../utils/format'
import { ProductInsightDrawer } from '../components/ProductInsightDrawer'
import styles from '../components/v2-common.module.css'

export const V2CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorRow[]>([])
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { api.getCompetitorSales().then(setRows) }, [])
  useEffect(() => { if (selectedId) api.getProductDetail(selectedId).then(setDetail) }, [selectedId])

  const chart = useMemo(() => rows.slice(0, 8).map((r) => ({
    name: r.type,
    크림: Math.round(r.competitorAmount / 1000000),
    자사: Math.round((r.selfAmount ?? 0) / 1000000),
  })), [rows])

  return (
    <section className={styles.page}>
      <div className={styles.headline}>
        <h1>경쟁사 분석 (리디자인)</h1>
        <span className={styles.badge}>Gap Finder</span>
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>비교 차트</div>
          <ResponsiveContainer width="100%" height={370}>
            <BarChart data={chart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" />
              <Tooltip />
              <Legend />
              <Bar dataKey="크림" fill="#3b82f6" />
              <Bar dataKey="자사" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>순위</th><th>품번</th><th>상품명</th><th>크림 판매액</th><th>자사 판매액</th><th>차이</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const gap = r.competitorAmount - (r.selfAmount ?? 0)
                return (
                  <tr key={r.id} className={styles.rowClickable} onClick={() => setSelectedId(r.id)}>
                    <td>{r.rank}</td><td>{r.type}</td><td>{r.name}</td><td>{won(r.competitorAmount)}</td><td>{won(r.selfAmount)}</td><td>{gap > 0 ? `+${c(gap)}` : c(gap)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ProductInsightDrawer detail={detail} onClose={() => setSelectedId(null)} />
    </section>
  )
}

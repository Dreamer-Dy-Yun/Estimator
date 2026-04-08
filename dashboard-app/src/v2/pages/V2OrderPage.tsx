import { useEffect, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { OrderRow } from '../../types'
import { c, won } from '../../utils/format'
import styles from '../components/v2-common.module.css'
import { useState } from 'react'

export const V2OrderPage = () => {
  const [rows, setRows] = useState<OrderRow[]>([])
  useEffect(() => { api.getOrderSimulation().then(setRows) }, [])

  const summary = useMemo(() => {
    const orderAmount = rows.reduce((acc, row) => acc + row.orderAmount, 0)
    const expected = rows.reduce((acc, row) => acc + row.expectedSales, 0)
    return { orderAmount, expected }
  }, [rows])

  return (
    <section className={styles.page}>
      <div className={styles.headline}>
        <h1>오더 시뮬레이션 (리디자인)</h1>
        <span className={styles.badge}>What-if</span>
      </div>
      <div className={styles.kpiGrid}>
        <div className={styles.kpi}><div className={styles.kpiLabel}>총 오더액</div><div className={styles.kpiValue}>{won(summary.orderAmount)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>기대 판매액</div><div className={styles.kpiValue}>{won(summary.expected)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>추천 SKU</div><div className={styles.kpiValue}>{c(rows.length)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>평균 오더량</div><div className={styles.kpiValue}>{rows.length ? c(Math.round(rows.reduce((a, r) => a + r.recommendedOrderQty, 0) / rows.length)) : '-'}</div></div>
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>시뮬레이션 추이</div>
          <ResponsiveContainer width="100%" height={370}>
            <AreaChart data={rows.map((r) => ({ name: r.type, 판매액: Math.round(r.expectedSales / 1000000), 이익액: Math.round(r.expectedOpMargin / 1000000) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="판매액" stroke="#3b82f6" fill="#3b82f633" />
              <Area type="monotone" dataKey="이익액" stroke="#16a34a" fill="#16a34a22" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>품번</th><th>추천 오더량</th><th>확정 오더량</th><th>오더액</th><th>기대 판매액</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.type}</td><td>{c(r.recommendedOrderQty)}</td><td>{c(r.confirmedOrderQty)}</td><td>{won(r.orderAmount)}</td><td>{won(r.expectedSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getOrderPlan } from '../../api'
import type { OrderPlanRow } from '../../types'
import { c, won } from '../../utils/format'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { ChartCard } from '../components/ChartCard'
import { KpiGrid } from '../components/KpiGrid'
import { PageHeader } from '../components/PageHeader'

export const OrderPage = () => {
  const [rows, setRows] = useState<OrderPlanRow[]>([])
  useEffect(() => { getOrderPlan().then(setRows) }, [])

  const summary = useMemo(() => {
    const orderAmount = rows.reduce((acc, row) => acc + row.orderAmount, 0)
    const expected = rows.reduce((acc, row) => acc + row.expectedSales, 0)
    return { orderAmount, expected }
  }, [rows])

  return (
    <section className={styles.page}>
      <PageHeader title="오더 시뮬레이션" badge="What-if" />
      <KpiGrid
        items={[
          { label: '총 오더액', value: won(summary.orderAmount) },
          { label: '기대 판매액', value: won(summary.expected) },
          { label: '추천 SKU', value: c(rows.length) },
          {
            label: '평균 오더량',
            value: rows.length ? c(Math.round(rows.reduce((a, r) => a + r.recommendedOrderQty, 0) / rows.length)) : '-',
          },
        ]}
      />
      <div className={styles.twoCol}>
        <ChartCard title="SKU별 기대 판매·이익 (요약)">
          <ResponsiveContainer width="100%" height={370}>
            <AreaChart data={rows.map((r) => ({ name: r.productCode, 판매액: Math.round(r.expectedSales / 1000000), 이익액: Math.round(r.expectedOpMargin / 1000000) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="판매액" stroke="#3b82f6" fill="#3b82f633" />
              <Area type="monotone" dataKey="이익액" stroke="#16a34a" fill="#16a34a22" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <AnalysisList
          columns={[
            { key: 'productCode', header: '상품 코드', cell: (r) => r.productCode, sortValue: (r) => r.productCode },
            { key: 'rq', header: '추천 오더량', cell: (r) => c(r.recommendedOrderQty), align: 'right', sortValue: (r) => r.recommendedOrderQty },
            { key: 'cq', header: '확정 오더량', cell: (r) => c(r.confirmedOrderQty), align: 'right', sortValue: (r) => r.confirmedOrderQty },
            { key: 'oa', header: '오더액', cell: (r) => won(r.orderAmount), align: 'right', sortValue: (r) => r.orderAmount },
            { key: 'es', header: '기대 판매액', cell: (r) => won(r.expectedSales), align: 'right', sortValue: (r) => r.expectedSales },
          ]}
          rows={rows}
        />
      </div>
    </section>
  )
}

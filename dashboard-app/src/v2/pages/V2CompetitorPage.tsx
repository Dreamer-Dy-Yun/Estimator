import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { CompetitorRow, ProductDetail } from '../../types'
import { c, won } from '../../utils/format'
import { ProductInsightDrawer } from '../components/ProductInsightDrawer'
import styles from '../components/v2-common.module.css'
import { PaginatedTable } from '../components/PaginatedTable'
import { V2ChartCard } from '../components/V2ChartCard'
import { V2PageHeader } from '../components/V2PageHeader'

export const V2CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorRow[]>([])
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => { api.getCompetitorSales().then(setRows) }, [])
  useEffect(() => {
    if (selectedId) {
      api.getProductDetail(selectedId).then(setDetail)
      return
    }
    setDetail(null)
  }, [selectedId])

  const chart = useMemo(() => rows.slice(0, 8).map((r) => ({
    name: r.type,
    크림: Math.round(r.competitorAmount / 1000000),
    자사: Math.round((r.selfAmount ?? 0) / 1000000),
  })), [rows])

  return (
    <section className={styles.page}>
      <V2PageHeader title="경쟁사 분석 (리디자인)" badge="Gap Finder" />
      <div className={styles.twoCol}>
        <V2ChartCard title="비교 차트">
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
        </V2ChartCard>
        <PaginatedTable
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'type', header: '품번', cell: (r) => r.type, sortValue: (r) => r.type },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'compA', header: '크림 판매액', cell: (r) => won(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfA', header: '자사 판매액', cell: (r) => won(r.selfAmount ?? 0), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
            { key: 'gap', header: '차이', cell: (r) => {
              const gap = r.competitorAmount - (r.selfAmount ?? 0)
              return gap > 0 ? `+${c(gap)}` : c(gap)
            }, align: 'right', sortValue: (r) => r.competitorAmount - (r.selfAmount ?? 0) },
          ]}
          rows={rows}
          page={1}
          pageSize={20}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>
      <ProductInsightDrawer
        detail={detail}
        periodStart="2025.01.01"
        periodEnd="2025.12.31"
        onClose={() => { setSelectedId(null); setDetail(null) }}
      />
    </section>
  )
}

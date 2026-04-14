import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getCompetitorSales } from '../../api'
import type { CompetitorSalesRow } from '../../types'
import { c, won } from '../../utils/format'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { ChartCard } from '../components/ChartCard'
import { PageHeader } from '../components/PageHeader'
import { useProductSummaryBundle } from '../hooks/useProductSummaryBundle'

/** 차트 시리즈 키 (금액은 백만 원 단위) */
const CHART_COMPETITOR_KEY = 'competitorM'
const CHART_SELF_KEY = 'selfM'

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorSalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const summaryBundle = useProductSummaryBundle(selectedId)

  useEffect(() => { getCompetitorSales().then(setRows) }, [])

  const chart = useMemo(() => rows.slice(0, 8).map((r) => ({
    name: r.styleCode,
    [CHART_COMPETITOR_KEY]: Math.round(r.competitorAmount / 1000000),
    [CHART_SELF_KEY]: Math.round((r.selfAmount ?? 0) / 1000000),
  })), [rows])

  return (
    <section className={styles.page}>
      <PageHeader title="경쟁사 분석" badge="Gap Finder" />
      <div className={styles.twoCol}>
        <ChartCard title="비교 차트">
          <ResponsiveContainer width="100%" height={370}>
            <BarChart data={chart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" />
              <Tooltip />
              <Legend />
              <Bar dataKey={CHART_COMPETITOR_KEY} name="경쟁사" fill="#3b82f6" />
              <Bar dataKey={CHART_SELF_KEY} name="자사" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <AnalysisList
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'styleCode', header: '품번', cell: (r) => r.styleCode, sortValue: (r) => r.styleCode },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'competitorAmount', header: '경쟁사 판매액', cell: (r) => won(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfAmount', header: '자사 판매액', cell: (r) => won(r.selfAmount ?? 0), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
            { key: 'gap', header: '차이', cell: (r) => {
              const gap = r.competitorAmount - (r.selfAmount ?? 0)
              return gap > 0 ? `+${c(gap)}` : c(gap)
            }, align: 'right', sortValue: (r) => r.competitorAmount - (r.selfAmount ?? 0) },
          ]}
          rows={rows}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>
      <ProductSummaryDrawer
        summary={summaryBundle?.summary ?? null}
        stockTrend={summaryBundle?.stockTrend ?? []}
        periodStart="2025.01.01"
        periodEnd="2025.12.31"
        onClose={() => setSelectedId(null)}
      />
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { ProductDetail, SalesRow } from '../../types'
import { c, pct, won } from '../../utils/format'
import { ProductInsightDrawer } from '../components/ProductInsightDrawer'
import styles from '../components/v2-common.module.css'
import { PaginatedTable } from '../components/PaginatedTable'

export const V2SelfPage = () => {
  const [rows, setRows] = useState<SalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => { api.getSelfSales().then(setRows) }, [])
  useEffect(() => { if (selectedId) api.getProductDetail(selectedId).then(setDetail) }, [selectedId])

  const kpi = useMemo(() => {
    const total = rows.reduce((acc, row) => acc + row.amount, 0)
    const avgRate = rows.length ? rows.reduce((acc, row) => acc + row.opMarginRate, 0) / rows.length : 0
    return { total, avgRate }
  }, [rows])

  // totalPages는 PaginatedTable 내부에서 계산되므로 여기서는 유지 불필요

  return (
    <section className={styles.page}>
      <div className={styles.headline}>
        <h1>자사 분석 (리디자인)</h1>
        <span className={styles.badge}>Insight First</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}><div className={styles.kpiLabel}>총 판매액</div><div className={styles.kpiValue}>{won(kpi.total)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>평균 영업이익율</div><div className={styles.kpiValue}>{pct(kpi.avgRate)}</div></div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>필터</div>
          <div className={styles.filter}>
            <div className={styles.field}><label>기간</label><input defaultValue="2025.01.01 ~ 2025.12.31" /></div>
            <div className={styles.field}><label>브랜드</label><select defaultValue="나이키"><option>나이키</option></select></div>
            <div className={styles.field}><label>카테고리</label><select defaultValue="신발"><option>신발</option></select></div>
          </div>
          <div className={styles.cardTitle} style={{ marginTop: 12 }}>포지셔닝</div>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart data={rows.map((r) => ({ x: r.opMarginRate, y: Math.round(r.amount / 1000000) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="영업이익율" />
              <YAxis type="number" dataKey="y" name="판매액(백만)" />
              <Tooltip />
              <Scatter fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <PaginatedTable<SalesRow>
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center' },
            { key: 'brand', header: '브랜드', cell: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category },
            { key: 'name', header: '상품명', cell: (r) => r.name },
            { key: 'avgPrice', header: '평균판매가', cell: (r) => won(r.avgPrice), align: 'right' },
            { key: 'qty', header: '판매량', cell: (r) => c(r.qty), align: 'right' },
            { key: 'amount', header: '총판매액', cell: (r) => won(r.amount), align: 'right' },
            { key: 'op', header: '영업이익율', cell: (r) => pct(r.opMarginRate), align: 'right' },
          ]}
          rows={rows}
          page={page}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      <ProductInsightDrawer detail={detail} onClose={() => setSelectedId(null)} />
    </section>
  )
}

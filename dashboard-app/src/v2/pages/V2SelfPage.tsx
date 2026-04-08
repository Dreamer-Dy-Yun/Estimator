import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { ProductDetail, SalesRow } from '../../types'
import { c, pct, won } from '../../utils/format'
import { ProductInsightDrawer } from '../components/ProductInsightDrawer'
import styles from '../components/v2-common.module.css'

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
    return { total, avgRate, sku: rows.length }
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const pageRows = rows.slice(startIndex, startIndex + pageSize)

  return (
    <section className={styles.page}>
      <div className={styles.headline}>
        <h1>자사 분석 (리디자인)</h1>
        <span className={styles.badge}>Insight First</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}><div className={styles.kpiLabel}>총 판매액</div><div className={styles.kpiValue}>{won(kpi.total)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>평균 영업이익율</div><div className={styles.kpiValue}>{pct(kpi.avgRate)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>분석 SKU</div><div className={styles.kpiValue}>{c(kpi.sku)}</div></div>
        <div className={styles.kpi}><div className={styles.kpiLabel}>Top SKU</div><div className={styles.kpiValue}>{rows[0]?.name ?? '-'}</div></div>
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

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th>브랜드</th>
                <th>상품명</th>
                <th>평균판매가</th>
                <th>판매량</th>
                <th>총판매액</th>
                <th>영업이익율</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className={styles.rowClickable} onClick={() => setSelectedId(row.id)}>
                  <td>{row.rank}</td>
                  <td>{row.brand}</td>
                  <td>{row.name}</td>
                  <td>{won(row.avgPrice)}</td>
                  <td>{c(row.qty)}</td>
                  <td>{won(row.amount)}</td>
                  <td>{pct(row.opMarginRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.pager}>
            <div className={styles.pagerInfo}>
              {rows.length ? `${startIndex + 1} - ${Math.min(startIndex + pageSize, rows.length)} / ${rows.length}` : '0 / 0'}
            </div>
            <div className={styles.pagerButtons}>
              <button onClick={() => setPage(1)} disabled={currentPage === 1}>처음</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>이전</button>
              <span>{currentPage} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>다음</button>
              <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>마지막</button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <ProductInsightDrawer detail={detail} onClose={() => setSelectedId(null)} />
    </section>
  )
}

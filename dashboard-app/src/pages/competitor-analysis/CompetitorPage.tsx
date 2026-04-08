import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import { DataTable, type Col } from '../../components/common/data-table'
import { FilterCard } from '../../components/common/filter-card'
import { SectionPanel } from '../../components/common/section-panel'
import { ProductDetailModal } from '../../components/product-detail-modal'
import type { CompetitorRow, ProductDetail } from '../../types'
import { c, won } from '../../utils/format'
import styles from './competitor-analysis.module.css'

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductDetail | null>(null)

  useEffect(() => { api.getCompetitorSales().then(setRows) }, [])
  useEffect(() => { if (selected) api.getProductDetail(selected).then(setDetail) }, [selected])

  const cols: Array<Col<CompetitorRow>> = useMemo(() => [
    { key: 'r', label: '순위', align: 'center', render: (r) => r.rank },
    { key: 'p', label: '백분위', align: 'right', render: (r) => r.percentile.toFixed(1) },
    { key: 'b', label: '브랜드', render: (r) => r.brand },
    { key: 'c', label: '카테고리', render: (r) => r.category },
    { key: 't', label: '품번', align: 'center', render: (r) => r.type },
    { key: 'n', label: '상품명', render: (r) => r.name },
    { key: 'cap', label: '크림 평균 판매가', align: 'right', render: (r) => won(r.competitorAvgPrice) },
    { key: 'cq', label: '크림 판매량', align: 'right', render: (r) => c(r.competitorQty) },
    { key: 'ca', label: '크림 총 판매액', align: 'right', render: (r) => won(r.competitorAmount) },
    { key: 'sap', label: '자사 평균 판매가', align: 'right', render: (r) => won(r.selfAvgPrice) },
    { key: 'sq', label: '자사 판매량', align: 'right', render: (r) => c(r.selfQty) },
    { key: 'sa', label: '자사 총 판매액', align: 'right', render: (r) => won(r.selfAmount) },
  ], [])

  const bars = rows.map((r) => ({
    type: r.type,
    크림: Math.round(r.competitorAmount / 1000000),
    자사: Math.round((r.selfAmount ?? 0) / 1000000),
  }))

  return (
    <>
      <SectionPanel title="경쟁사 판매 분석">
        <div className={styles.grid}>
          <div className={styles.left}>
            <FilterCard rows={[
              { label: '조회기간', left: '2025.01.01', right: '2025.12.31' },
              { label: '브랜드', left: '나이키' },
              { label: '카테고리', left: '신발' },
              { label: '세부 카테고리', left: '' },
              { label: '판매량', left: '', right: '', unit: '개' },
              { label: '총 판매액', left: '', right: '', unit: '원' },
            ]} />
            <div className={styles.chartCard}>
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={bars} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="type" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="크림" fill="#3b82f6" />
                  <Bar dataKey="자사" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <DataTable columns={cols} rows={rows} onRowClick={(r) => setSelected(r.id)} />
        </div>
      </SectionPanel>
      <ProductDetailModal open={Boolean(selected)} detail={detail} onClose={() => setSelected(null)} />
    </>
  )
}

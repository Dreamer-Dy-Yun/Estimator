import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import { DataTable, type Col } from '../../components/common/data-table'
import { FilterCard } from '../../components/common/filter-card'
import { SectionPanel } from '../../components/common/section-panel'
import { ProductDetailModal } from '../../components/product-detail-modal'
import type { ProductDetail, SalesRow } from '../../types'
import { c, pct, won } from '../../utils/format'
import styles from './self-analysis.module.css'

export const SelfSalesPage = () => {
  const [rows, setRows] = useState<SalesRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductDetail | null>(null)

  useEffect(() => { api.getSelfSales().then(setRows) }, [])
  useEffect(() => { if (selected) api.getProductDetail(selected).then(setDetail) }, [selected])

  const cols: Array<Col<SalesRow>> = useMemo(() => [
    { key: 'r', label: '순위', align: 'center', render: (r) => r.rank },
    { key: 'p', label: '백분위', align: 'right', render: (r) => r.percentile.toFixed(1) },
    { key: 'b', label: '브랜드', render: (r) => r.brand },
    { key: 'c', label: '카테고리', render: (r) => r.category },
    { key: 't', label: '품번', align: 'center', render: (r) => r.type },
    { key: 'n', label: '상품명', render: (r) => r.name },
    { key: 'ap', label: '평균 판매가', align: 'right', render: (r) => won(r.avgPrice) },
    { key: 'q', label: '판매량', align: 'right', render: (r) => c(r.qty) },
    { key: 'a', label: '총 판매액', align: 'right', render: (r) => won(r.amount) },
    { key: 'ac', label: '평균 원가', align: 'right', render: (r) => won(r.avgCost) },
    { key: 'mr', label: '평균 매출이익율', align: 'right', render: (r) => pct(r.marginRate) },
    { key: 'fr', label: '평균 수수료율', align: 'right', render: (r) => pct(r.feeRate) },
    { key: 'or', label: '평균 영업이익율', align: 'right', render: (r) => pct(r.opMarginRate) },
    { key: 'oa', label: '총 영업이익액', align: 'right', render: (r) => won(r.opMarginAmount) },
  ], [])

  const scatter = rows.map((r) => ({ x: r.opMarginRate, y: Math.round(r.amount / 1000000), name: r.name }))

  return (
    <>
      <SectionPanel title="자사 판매 분석">
        <div className={styles.grid}>
          <div className={styles.left}>
            <FilterCard rows={[
              { label: '조회기간', left: '2025.01.01', right: '2025.12.31' },
              { label: '브랜드', left: '나이키' },
              { label: '카테고리', left: '신발' },
              { label: '세부 카테고리', left: '' },
              { label: '판매량', left: '', right: '', unit: '개' },
              { label: '총 판매액', left: '', right: '', unit: '원' },
              { label: '평균 영업이익율', left: '', right: '', unit: '%' },
              { label: '총 영업이익액', left: '', right: '', unit: '원' },
            ]} />
            <div className={styles.chartCard}>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="x" />
                  <YAxis type="number" dataKey="y" />
                  <Tooltip />
                  <ReferenceLine x={0} stroke="#dc2626" />
                  <ReferenceLine x={6.5} stroke="#2563eb" />
                  <Scatter data={scatter} fill="#3b82f6" />
                </ScatterChart>
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

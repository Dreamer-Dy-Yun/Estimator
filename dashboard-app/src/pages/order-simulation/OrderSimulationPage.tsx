import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import { DataTable, type Col } from '../../components/common/data-table'
import { SectionPanel } from '../../components/common/section-panel'
import { ProductDetailModal } from '../../components/product-detail-modal'
import type { OrderRow, ProductDetail } from '../../types'
import { c, won } from '../../utils/format'
import styles from './order-simulation.module.css'

export const OrderSimulationPage = () => {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductDetail | null>(null)

  useEffect(() => { api.getOrderSimulation().then(setRows) }, [])
  useEffect(() => { if (selected) api.getProductDetail(selected).then(setDetail) }, [selected])

  const cols: Array<Col<OrderRow>> = useMemo(() => [
    { key: 'r', label: '순위', align: 'center', render: (r) => r.rank },
    { key: 'p', label: '백분위', align: 'right', render: (r) => r.percentile.toFixed(1) },
    { key: 'b', label: '브랜드', render: (r) => r.brand },
    { key: 'ca', label: '카테고리', render: (r) => r.category },
    { key: 't', label: '품번', align: 'center', render: (r) => r.type },
    { key: 'n', label: '상품명', render: (r) => r.name },
    { key: 'd1', label: '일평균 판매량', align: 'right', render: (r) => c(r.dailyQty) },
    { key: 'd2', label: '일평균(입고전)', align: 'right', render: (r) => c(r.predictedDailyQtyUntilInbound) },
    { key: 'd3', label: '일평균(입고후)', align: 'right', render: (r) => c(r.predictedDailyQtyAfterInbound) },
    { key: 'as', label: '가용재고', align: 'right', render: (r) => c(r.availableStock) },
    { key: 'cs', label: '현재고', align: 'right', render: (r) => c(r.currentStock) },
    { key: 'in', label: '입고예정', align: 'right', render: (r) => c(r.inboundQty) },
    { key: 'ss', label: '안전재고', align: 'right', render: (r) => c(r.safetyStock) },
    { key: 'rq', label: '추천 오더량', align: 'right', render: (r) => c(r.recommendedOrderQty) },
    { key: 'cq', label: '오더량 확정', align: 'right', render: (r) => c(r.confirmedOrderQty) },
    { key: 'oa', label: '오더액', align: 'right', render: (r) => won(r.orderAmount) },
    { key: 'es', label: '기대 판매액', align: 'right', render: (r) => won(r.expectedSales) },
    { key: 'em', label: '영업이익액', align: 'right', render: (r) => won(r.expectedOpMargin) },
  ], [])

  const chart = rows.map((r) => ({ type: r.type, 판매액: Math.round(r.expectedSales / 1000000), 이익액: Math.round(r.expectedOpMargin / 1000000) }))

  return (
    <>
      <SectionPanel title="오더 시뮬레이션">
        <div className={styles.content}>
          <DataTable columns={cols} rows={rows} onRowClick={(r) => setSelected(r.id)} />
          <div className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="판매액" stroke="#3b82f6" fill="#3b82f633" />
                <Area type="monotone" dataKey="이익액" stroke="#f59e0b" fill="#f59e0b33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionPanel>
      <ProductDetailModal open={Boolean(selected)} detail={detail} onClose={() => setSelected(null)} />
    </>
  )
}

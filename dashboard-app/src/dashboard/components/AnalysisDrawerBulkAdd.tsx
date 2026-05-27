import type { ComponentProps } from 'react'
import { AnalysisCandidateBulkAddModal } from './candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from './product-drawer/ProductDrawer'

type ProductDrawerProps = ComponentProps<typeof ProductDrawer>
type Props = Pick<ProductDrawerProps, 'summary' | 'loading' | 'periodStart' | 'periodEnd' | 'companyUuid' | 'forecastMonths' | 'selfCompanyLabel' | 'onForecastMonthsChange' | 'onRequestNavigateAdjacent'> & {
  openSkuGroupKeys: string[]
  bulkAddOpen: boolean
  onCloseDrawer: () => void
  onCloseBulkAdd: () => void
  onBulkAddDone: () => void
}

export function AnalysisDrawerBulkAdd({
  summary,
  loading,
  periodStart,
  periodEnd,
  companyUuid,
  forecastMonths,
  selfCompanyLabel,
  onForecastMonthsChange,
  onRequestNavigateAdjacent,
  openSkuGroupKeys,
  bulkAddOpen,
  onCloseDrawer,
  onCloseBulkAdd,
  onBulkAddDone,
}: Props) {
  return (
    <>
      <ProductDrawer
        summary={summary}
        loading={loading}
        periodStart={periodStart}
        periodEnd={periodEnd}
        companyUuid={companyUuid}
        forecastMonths={forecastMonths}
        selfCompanyLabel={selfCompanyLabel}
        onForecastMonthsChange={onForecastMonthsChange}
        onClose={onCloseDrawer}
        onRequestNavigateAdjacent={onRequestNavigateAdjacent}
        secondaryEnabled={false}
      />
      <AnalysisCandidateBulkAddModal
        open={bulkAddOpen}
        skuGroupKeys={openSkuGroupKeys}
        periodStart={periodStart}
        periodEnd={periodEnd}
        companyUuid={companyUuid}
        forecastMonths={forecastMonths}
        onClose={onCloseBulkAdd}
        onDone={onBulkAddDone}
      />
    </>
  )
}

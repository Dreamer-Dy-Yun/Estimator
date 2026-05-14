import { BlockMath } from 'react-katex'
import type { Dispatch, SetStateAction } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
import type { ProductPrimarySummary } from '../../../../types'
import { formatDateTimeMinute } from '../../../../utils/date'
import { PortalHelpPopoverLayer } from '../../PortalHelpPopover'
import commonStyles from '../../common.module.css'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import { AiCommentCard } from './cards/AiCommentCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesForecastCard } from './cards/SalesForecastCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import {
  CandidateStashOrderActionCard,
  InnerCandidateActionCard,
  type CandidateItemPanelContext,
} from './candidateActionCards'
import { CandidateStashPickerModal } from './CandidateStashPickerModal'
import styles from './secondaryDrawer.module.css'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'

type HelpIds = {
  confirmOrder: string
  forecastQtyCalc: string
  expectedOpProfitRate: string
  totalOrderBalance: string
  expectedInboundOrderBalance: string
  sizeRecQty: string
  salesForecastSizeOrder: string
}
type Props = {
  pageName: string
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showSnapshotInfo: boolean
  onShowSnapshotInfoChange: Dispatch<SetStateAction<boolean>>
  model: ReturnType<typeof useSecondaryForecastModel>
  aiComment: string
  selfWeightPct: number
  onSelfWeightPctChange: (value: number) => void
  minOrderDate: string
  leadTimeStartDate: string
  leadTimeEndDate: string
  bufferStock: number
  unitCostInput: number
  unitPriceInput: number
  expectedFeeRatePct: number
  onCurrentOrderDateChange: (value: string) => void
  onNextOrderDateChange: (value: string) => void
  onBufferStockChange: (value: number) => void
  onUnitCostChange: (value: number) => void
  onUnitPriceChange: (value: number) => void
  onExpectedFeeRatePctChange: (value: number) => void
  portalHelp: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  helpIds: HelpIds
}
const getHelpTooltipId = (helpIds: HelpIds, id: SecondaryHelpId) => {
  switch (id) {
    case 'confirmOrder':
      return helpIds.confirmOrder
    case 'forecastQtyCalc':
      return helpIds.forecastQtyCalc
    case 'expectedOpProfitRate':
      return helpIds.expectedOpProfitRate
    case 'totalOrderBalance':
      return helpIds.totalOrderBalance
    case 'expectedInboundOrderBalance':
      return helpIds.expectedInboundOrderBalance
    case 'sizeRecQty':
      return helpIds.sizeRecQty
    case 'salesForecastSizeOrder':
      return helpIds.salesForecastSizeOrder
  }
}
export function ProductSecondaryDrawerContent({
  pageName,
  primary,
  channel,
  candidateItemContext,
  hasSavedSnapshot,
  showSnapshotInfo,
  onShowSnapshotInfoChange,
  model,
  aiComment,
  selfWeightPct,
  onSelfWeightPctChange,
  minOrderDate,
  leadTimeStartDate,
  leadTimeEndDate,
  bufferStock,
  unitCostInput,
  unitPriceInput,
  expectedFeeRatePct,
  onCurrentOrderDateChange,
  onNextOrderDateChange,
  onBufferStockChange,
  onUnitCostChange,
  onUnitPriceChange,
  onExpectedFeeRatePctChange,
  portalHelp,
  helpIds,
}: Props) {
  const {
    salesInsightError,
    forecastCalc,
    forecastCalcError,
    forecastInputs,
    sizeRows,
    manualConfirmDerived,
    dailyTrend,
    dailyTrendSizeOptions,
    candidateActions,
    handleConfirmQtyChange,
  } = model
  const recommendedQtyTotal = sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.recommendedQty)), 0)
  const confirmedQtyTotal = sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty)), 0)
  const perUnitFee = Math.round((unitPriceInput * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPriceInput - unitCostInput - perUnitFee
  const liveCandidateCompactMode = candidateItemContext != null && !showSnapshotInfo
  const aiCommentCard = (
    <ComponentErrorBoundary page={pageName} unit="AiCommentCard">
      <AiCommentCard comment={aiComment} />
    </ComponentErrorBoundary>
  )
  const sizeOrderCard = (
    <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
      <SizeOrderCard
        sizeOrder={{
          channelLabel: channel.label,
          selfWeightPct,
          sizeRows,
          totalOrderBalanceHelpId: helpIds.totalOrderBalance,
          expectedInboundOrderBalanceHelpId: helpIds.expectedInboundOrderBalance,
          sizeRecQtyHelpId: helpIds.sizeRecQty,
          salesForecastHelpId: helpIds.salesForecastSizeOrder,
          currentStockQty: forecastCalc?.display.currentStockQtyTotal ?? 0,
          totalOrderBalanceQty: forecastCalc?.display.totalOrderBalanceTotal ?? 0,
          expectedInboundOrderBalanceQty: forecastCalc?.display.expectedInboundOrderBalanceTotal ?? 0,
          currentStockQtyBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
          totalOrderBalanceBySize: forecastCalc?.display.totalOrderBalanceBySize ?? [],
          expectedInboundOrderBalanceBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
          manualConfirmBySize: manualConfirmDerived,
        }}
        actions={{
          onSelfWeightPctChange,
          onConfirmQtyChange: handleConfirmQtyChange,
        }}
        help={portalHelp}
      />
    </ComponentErrorBoundary>
  )
  return (
    <div className={styles.panel}>
      <div className={styles.metaFilterRow}>
        <div className={styles.metaFilterMetaBlock}>
          <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
            <ProductMetaCard primary={primary} />
          </ComponentErrorBoundary>
        </div>
        <div className={styles.metaFilterActionBlock}>
          <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
            <div className={styles.metaFilterActionGrid}>
              {candidateItemContext != null ? (
                <InnerCandidateActionCard
                  context={candidateItemContext}
                  loading={candidateActions.loading}
                  saveLabel={hasSavedSnapshot ? '수정' : '저장'}
                  hasSnapshot={hasSavedSnapshot}
                  showSnapshotInfo={showSnapshotInfo}
                  onShowSnapshotInfoChange={onShowSnapshotInfoChange}
                  onSave={candidateActions.saveCandidateItemChanges}
                />
              ) : (
                <CandidateStashOrderActionCard
                  selectedTitle={candidateActions.selectedCandidate?.name ?? '-'}
                  selectedSub={
                    candidateActions.selectedCandidate?.dbCreatedAt
                      ? formatDateTimeMinute(candidateActions.selectedCandidate.dbCreatedAt)
                      : '-'
                  }
                  loading={candidateActions.loading}
                  confirmDisabled={candidateActions.selectedCandidate == null}
                  onOpenStashPicker={candidateActions.openPicker}
                  onConfirmOrder={candidateActions.confirmOrder}
                  portalHelp={portalHelp}
                  confirmOrderHelpId={helpIds.confirmOrder}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {liveCandidateCompactMode ? (
        <div className={styles.salesStockAiRow}>
          {aiCommentCard}
          {sizeOrderCard}
        </div>
      ) : (
        <>
          <div className={styles.salesStockAiRow}>
            <ComponentErrorBoundary page={pageName} unit="SalesForecastCard">
              <SalesForecastCard
                forecast={{
                  inputs: forecastInputs,
                  error: salesInsightError ?? forecastCalcError,
                  computed: {
                    recommendedOrderQtyTotal: recommendedQtyTotal,
                    confirmedOrderQtyTotal: confirmedQtyTotal,
                    forecastExpectedSales: recommendedQtyTotal * unitPriceInput,
                    forecastOpProfit: recommendedQtyTotal * perUnitOpMargin,
                    confirmedExpectedSales: confirmedQtyTotal * unitPriceInput,
                    confirmedOpProfit: confirmedQtyTotal * perUnitOpMargin,
                  },
                }}
                orderSettings={{
                  currentOrderDate: leadTimeStartDate,
                  nextOrderDate: leadTimeEndDate,
                  minOrderDate,
                  bufferStock,
                  unitCost: unitCostInput,
                  unitPrice: unitPriceInput,
                  expectedFeeRatePct,
                }}
                actions={{
                  onCurrentOrderDateChange,
                  onNextOrderDateChange,
                  onBufferStockChange,
                  onUnitCostChange,
                  onUnitPriceChange,
                  onExpectedFeeRatePctChange,
                }}
                help={{
                  labelIds: {
                    forecastQtyCalc: helpIds.forecastQtyCalc,
                    expectedOpProfitRate: helpIds.expectedOpProfitRate,
                  },
                  portal: portalHelp,
                }}
              />
            </ComponentErrorBoundary>
            {aiCommentCard}
          </div>
          <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
            <SalesTrendDailyCard
              skuGroupKey={primary.skuGroupKey}
              competitorChannelLabel={channel.label}
              sizeOptions={dailyTrendSizeOptions}
              trend={{
                series: dailyTrend.dailyTrendSeries,
                tickIndices: dailyTrend.dailyTickIndices,
                periodShade: dailyTrend.dailyPeriodShade,
                forecastShade: dailyTrend.dailyForecastShade,
                error: dailyTrend.dailyTrendError,
              }}
            />
          </ComponentErrorBoundary>
          {sizeOrderCard}
        </>
      )}
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={(hid) => getHelpTooltipId(helpIds, hid)}
      >
        {(hid) => (
          <>
            {hid === 'confirmOrder' && <p>{KO.hintSnapshot}</p>}
            {hid === 'forecastQtyCalc' && <p>{KO.helpForecastQtyCalc}</p>}
            {hid === 'expectedOpProfitRate' && <BlockMath math={KO.helpExpectedOpProfitRateLatex} />}
            {hid === 'totalOrderBalance' && <p>{KO.helpTotalOrderBalance}</p>}
            {hid === 'expectedInboundOrderBalance' && <p>{KO.helpExpectedInboundOrderBalance}</p>}
            {hid === 'sizeRecQty' && <p>{KO.helpSizeRecQty}</p>}
            {hid === 'salesForecastSizeOrder' && <p>{KO.helpSalesForecastSizeOrder}</p>}
          </>
        )}
      </PortalHelpPopoverLayer>
      {candidateActions.listOpen && (
        <CandidateStashPickerModal
          options={candidateActions.stashes}
          selectedUuid={candidateActions.selectedCandidate?.uuid ?? null}
          nameInput={candidateActions.nameInput}
          noteInput={candidateActions.noteInput}
          loading={candidateActions.loading}
          onNameInputChange={candidateActions.setNameInput}
          onNoteInputChange={candidateActions.setNoteInput}
          onCreate={candidateActions.createCandidate}
          onClose={() => candidateActions.setListOpen(false)}
          onSelect={candidateActions.selectCandidate}
        />
      )}
    </div>
  )
}

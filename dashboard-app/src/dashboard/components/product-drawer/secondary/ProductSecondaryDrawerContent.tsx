import type { CandidateStashSummary, SecondaryStockOrderCalcResult } from '../../../../api'
import type { OrderSnapshotDocument, ProductSalesInsightColumn, SecondaryDailyTrendPoint } from '../../../../api/types'
import type { SecondaryStockOrderDisplaySizeRow } from '../../../../api/types/secondary'
import type { CandidateStashPickerOption } from './CandidateStashPickerModal'
import type { SecondarySizeOrderDisplayRow } from './model/secondarySizeOrderRows'
import { BlockMath } from 'react-katex'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
import type { OrderSnapshotAiComment } from '../../../../snapshot/orderSnapshotTypes'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../types'
import { PortalHelpPopoverLayer } from '../../PortalHelpPopover'
import commonStyles from '../../common.module.css'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import { AiCommentCard } from './cards/AiCommentCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import {
  SalesForecastCard,
  type SalesForecastOrderInputActions,
  type SalesForecastOrderInputFields,
} from './cards/SalesForecastCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import type { CandidateItemPanelContext } from './secondaryDrawerTypes'
import { SecondaryDrawerCandidateActions } from './SecondaryDrawerCandidateActions'
import styles from './secondaryDrawer.module.css'
import type { SecondaryHelpId, SecondaryHelpIds } from './secondaryDrawerTypes'
import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'

export type Props = {
  pageName: string
  primary: ProductPrimarySummary
  comparisonLabel: string
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showingConfirmedValues: boolean
  onResetToLive: () => void
  onRestoreConfirmed: () => void
  model: ReturnType<typeof useSecondaryForecastModel>
  aiComment: OrderSnapshotAiComment
  aiCommentLoading: boolean
  aiCommentError: ApiUnitErrorInfo | null
  onRequestAiComment: () => void
  selfCompanyLabel: string
  selfWeightPct: number
  onSelfWeightPctChange: (value: number) => void
  orderInputFields: SalesForecastOrderInputFields
  orderInputActions: SalesForecastOrderInputActions
  portalHelp: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  helpIds: SecondaryHelpIds
}
export function ProductSecondaryDrawerContent({
  pageName,
  primary,
  comparisonLabel,
  candidateItemContext,
  hasSavedSnapshot,
  showingConfirmedValues,
  onResetToLive,
  onRestoreConfirmed,
  model,
  aiComment,
  aiCommentLoading,
  aiCommentError,
  onRequestAiComment,
  selfCompanyLabel,
  selfWeightPct,
  onSelfWeightPctChange,
  orderInputFields,
  orderInputActions,
  portalHelp,
  helpIds,
}: Props) : React.JSX.Element {
  const {
    salesInsightError,
    forecastCalcError,
    forecastCalcLoading,
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived,
    stockOrderDisplay,
    stockOrderCalculationReady,
    guardStockOrderCalculation,
    dailyTrend,
    dailyTrendSizeOptions,
    candidateActions,
    handleConfirmQtyChange,
  }: { stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null; stockOrderCalculationReady: boolean; guardStockOrderCalculation: () => boolean; candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; buildSnapshot: () => OrderSnapshotDocument; handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; selectedStart: string; selectedEnd: string; } = model
  const recommendedQtyTotal: number = sizeRows.reduce((acc: number, r: SecondarySizeOrderDisplayRow) : number => acc + Math.max(0, Math.round(r.recommendedQty)), 0)
  const confirmedQtyTotal: number = sizeRows.reduce((acc: number, r: SecondarySizeOrderDisplayRow) : number => acc + Math.max(0, Math.round(r.confirmQty)), 0)
  const { unitCost, unitPrice, expectedFeeRatePct }: SalesForecastOrderInputFields = orderInputFields
  const perUnitFee: number = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin: number = unitPrice - unitCost - perUnitFee
  const forecastExpectedSales: number = stockOrderCalculationReady ? recommendedQtyTotal * unitPrice : 0
  const forecastOpProfit: number = stockOrderCalculationReady ? recommendedQtyTotal * perUnitOpMargin : 0
  const confirmedExpectedSales: number = stockOrderCalculationReady ? confirmedQtyTotal * unitPrice : 0
  const confirmedOpProfit: number = stockOrderCalculationReady ? confirmedQtyTotal * perUnitOpMargin : 0
  return (
    <div className={styles.panel}>
      <div className={styles.metaFilterRow}>
        <div className={styles.metaFilterMetaBlock}>
          <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
            <ProductMetaCard primary={primary} />
          </ComponentErrorBoundary>
        </div>
        <SecondaryDrawerCandidateActions
          candidateItemContext={candidateItemContext}
          hasSavedSnapshot={hasSavedSnapshot}
          showingConfirmedValues={showingConfirmedValues}
          candidateActions={candidateActions}
          onResetToLive={onResetToLive}
          onRestoreConfirmed={onRestoreConfirmed}
          portalHelp={portalHelp}
          confirmOrderHelpId={helpIds.confirmOrder}
        />
      </div>
      <div className={styles.salesStockAiRow}>
        <ComponentErrorBoundary page={pageName} unit="SalesForecastCard">
          <SalesForecastCard
            forecast={{
              inputs: stockOrderDisplayInputs,
              loading: forecastCalcLoading,
              error: forecastCalcError ?? salesInsightError,
              calculationReady: stockOrderCalculationReady,
              computed: {
                recommendedOrderQtyTotal: recommendedQtyTotal,
                confirmedOrderQtyTotal: confirmedQtyTotal,
                forecastExpectedSales,
                forecastOpProfit,
                confirmedExpectedSales,
                confirmedOpProfit,
              },
            }}
            orderInputFields={orderInputFields}
            actions={orderInputActions}
            help={{
              labelIds: {
                forecastQtyCalc: helpIds.forecastQtyCalc,
                expectedOpProfitRate: helpIds.expectedOpProfitRate,
              },
              portal: portalHelp,
            }}
          />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="AiCommentCard">
          <AiCommentCard
            aiComment={aiComment}
            loading={aiCommentLoading}
            error={aiCommentError}
            onRequest={stockOrderCalculationReady ? onRequestAiComment : guardStockOrderCalculation}
          />
        </ComponentErrorBoundary>
      </div>
      <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
        <SizeOrderCard
          sizeOrder={{
            comparisonLabel,
            selfCompanyLabel,
            selfWeightPct,
            sizeRows,
            helpIds,
            stockOrderDisplay,
            calculationReady: stockOrderCalculationReady,
            manualConfirmBySize: manualConfirmDerived,
            currentOrderInboundDueDate: orderInputFields.currentOrderInboundDueDate,
            nextOrderInboundDueDate: orderInputFields.nextOrderInboundDueDate,
          }}
          actions={{
            onSelfWeightPctChange,
            onConfirmQtyChange: handleConfirmQtyChange,
          }}
          help={portalHelp}
        />
      </ComponentErrorBoundary>
      <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
        <SalesTrendDailyCard
          skuGroupKey={primary.skuGroupKey}
          selfCompanyLabel={selfCompanyLabel}
          comparisonLabel={comparisonLabel}
          sizeOptions={dailyTrendSizeOptions}
          trend={{
            series: dailyTrend.dailyTrendSeries,
            loading: dailyTrend.dailyTrendLoading,
            tickIndices: dailyTrend.dailyTickIndices,
            periodShade: dailyTrend.dailyPeriodShade,
            forecastShade: dailyTrend.dailyForecastShade,
            error: dailyTrend.dailyTrendError,
          }}
        />
      </ComponentErrorBoundary>
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={(hid: 'confirmOrder' | 'forecastQtyCalc' | 'expectedOpProfitRate' | 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder') : string => helpIds[hid]}
      >
        {(hid: 'confirmOrder' | 'forecastQtyCalc' | 'expectedOpProfitRate' | 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder') : React.JSX.Element => (
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
    </div>
  )
}

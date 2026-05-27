import { BlockMath } from 'react-katex'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
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

type Props = {
  pageName: string
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showingConfirmedValues: boolean
  onResetToLive: () => void
  onRestoreConfirmed: () => void
  model: ReturnType<typeof useSecondaryForecastModel>
  aiComment: string
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
  channel,
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
}: Props) {
  const {
    salesInsightError,
    salesInsightLoading,
    forecastCalcError,
    forecastCalcLoading,
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived,
    stockOrderDisplay,
    dailyTrend,
    dailyTrendSizeOptions,
    candidateActions,
    handleConfirmQtyChange,
  } = model
  const recommendedQtyTotal = sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.recommendedQty)), 0)
  const confirmedQtyTotal = sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty)), 0)
  const { unitCost, unitPrice, expectedFeeRatePct } = orderInputFields
  const perUnitFee = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPrice - unitCost - perUnitFee
  const forecastExpectedSales = recommendedQtyTotal * unitPrice
  const forecastOpProfit = recommendedQtyTotal * perUnitOpMargin
  const confirmedExpectedSales = confirmedQtyTotal * unitPrice
  const confirmedOpProfit = confirmedQtyTotal * perUnitOpMargin
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
              loading: salesInsightLoading || forecastCalcLoading,
              error: salesInsightError ?? forecastCalcError,
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
            comment={aiComment}
            loading={aiCommentLoading}
            error={aiCommentError}
            onRequest={onRequestAiComment}
          />
        </ComponentErrorBoundary>
      </div>
      <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
        <SalesTrendDailyCard
          skuGroupKey={primary.skuGroupKey}
          selfCompanyLabel={selfCompanyLabel}
          competitorChannelLabel={channel.label}
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
      <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
        <SizeOrderCard
          sizeOrder={{
            channelLabel: channel.label,
            selfCompanyLabel,
            selfWeightPct,
            sizeRows,
            helpIds,
            stockOrderDisplay,
            manualConfirmBySize: manualConfirmDerived,
          }}
          actions={{
            onSelfWeightPctChange,
            onConfirmQtyChange: handleConfirmQtyChange,
          }}
          help={portalHelp}
        />
      </ComponentErrorBoundary>
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={(hid) => helpIds[hid]}
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
    </div>
  )
}

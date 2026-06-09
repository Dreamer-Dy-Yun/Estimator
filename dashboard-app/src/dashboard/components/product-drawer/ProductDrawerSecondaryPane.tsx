import type { OrderSnapshotPrimarySummaryV2 } from '../../../snapshot/orderSnapshotTypes'
import type { ProductSecondarySizeRow } from '../../../types'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryCompetitorChannel } from '../../../api/types'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import styles from '../common.module.css'
import { ProductSecondaryDrawer } from './secondary/ProductSecondaryDrawer'
import type { CandidateItemPanelContext } from './secondary/secondaryDrawerTypes'

export type ProductDrawerSecondaryPaneProps = {
  open: boolean
  summary: ProductPrimarySummary
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  forecastMonths: number
  companyUuid?: string
  baseSubject: ProductComparisonBaseSubjectRef
  selfCompanyLabel: string
  channelsError: ApiUnitErrorInfo | null
  channelsLoading: boolean
  selectedChannelReady: boolean
  selectedChannelMissing: boolean
  secondaryDetail: ProductSecondaryDetail | null
  secondaryDetailError: ApiUnitErrorInfo | null
  hydrateForPanel: OrderSnapshotDocumentV2 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    competitorChannelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    comparisonTarget: ProductComparisonTarget | null
    onCompetitorChannelChange: (channelId: string) => void
  }
}

function isFiniteCompetitorRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getMissingCompetitorRatioSizes(
  secondaryDetail: ProductSecondaryDetail,
): string[] {
  return secondaryDetail.sizeRows
    .filter((row: ProductSecondarySizeRow) : boolean => !isFiniteCompetitorRatio(secondaryDetail.competitorRatioBySize[row.size]))
    .map((row: ProductSecondarySizeRow) : string => row.size)
}

function SecondaryPaneStatus({
  children,
  error,
}: {
  children: React.ReactNode
  error?: ApiUnitErrorInfo | null
}) : React.JSX.Element {
  return (
    <div className={styles.drawerSecondaryLoading}>
      {children}
      {error && <ApiUnitErrorBadge error={error} />}
    </div>
  )
}

export function ProductDrawerSecondaryPane({
  open,
  summary,
  periodStart,
  periodEnd,
  selectedStartMonth,
  selectedEndMonth,
  forecastMonths,
  companyUuid,
  baseSubject,
  selfCompanyLabel,
  channelsError,
  channelsLoading,
  selectedChannelReady,
  selectedChannelMissing,
  secondaryDetail,
  secondaryDetailError,
  hydrateForPanel,
  candidateItemContext,
  channelState,
}: ProductDrawerSecondaryPaneProps) : React.JSX.Element {
  const missingCompetitorRatioSizes: string[] =
    secondaryDetail == null ? [] : getMissingCompetitorRatioSizes(secondaryDetail)
  const primaryForSecondaryPanel: OrderSnapshotPrimarySummaryV2 = hydrateForPanel?.drawer1.summary ?? summary
  let content: React.ReactNode = null

  if (open) {
    if (channelsError) {
      content = <SecondaryPaneStatus error={channelsError}>경쟁 채널 데이터를 불러오지 못했습니다.</SecondaryPaneStatus>
    } else if (!selectedChannelReady) {
      content = (
        <SecondaryPaneStatus>
          {!channelsLoading && !selectedChannelMissing
            ? '비교 대상이 없어 2차 드로워를 표시할 수 없습니다.'
            : selectedChannelMissing
            ? '선택한 경쟁 채널이 현재 채널 목록에 없습니다.'
            : <LoadingSpinner label="경쟁 채널 데이터를 불러오는 중" />}
        </SecondaryPaneStatus>
      )
    } else if (secondaryDetailError) {
      content = <SecondaryPaneStatus error={secondaryDetailError}>2차 데이터를 불러오지 못했습니다.</SecondaryPaneStatus>
    } else if (!secondaryDetail) {
      content = <SecondaryPaneStatus><LoadingSpinner label="2차 데이터를 불러오는 중" /></SecondaryPaneStatus>
    } else if (missingCompetitorRatioSizes.length > 0) {
      content = (
        <SecondaryPaneStatus>
          경쟁사 사이즈 비중 데이터가 누락되어 2차 예측을 표시할 수 없습니다.
          <br />
          누락 사이즈: {missingCompetitorRatioSizes.join(', ')}
        </SecondaryPaneStatus>
      )
    } else {
      content = (
        <ProductSecondaryDrawer
          primary={primaryForSecondaryPanel}
          secondary={secondaryDetail}
          periodStart={periodStart}
          periodEnd={periodEnd}
          selectedStartMonth={selectedStartMonth}
          selectedEndMonth={selectedEndMonth}
            forecastMonths={forecastMonths}
            companyUuid={companyUuid}
            baseSubject={baseSubject}
          selfCompanyLabel={selfCompanyLabel}
          pageName="ProductDrawer > ProductSecondaryDrawer"
          prefillFromSnapshot={hydrateForPanel}
          candidateItemContext={candidateItemContext ?? null}
          channelState={channelState}
        />
      )
    }
  }

  return (
    <div
      className={`${styles.drawerExpandPane} ${open ? styles.drawerExpandPaneOpen : ''}`}
      aria-hidden={!open}
    >
      <div className={styles.drawerExpandPaneInner}>
        {content}
      </div>
    </div>
  )
}

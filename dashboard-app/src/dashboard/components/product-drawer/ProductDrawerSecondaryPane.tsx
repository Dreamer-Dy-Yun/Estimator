import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ReactNode } from 'react'
import type { SecondaryCompetitorChannel } from '../../../api/types'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import styles from '../common.module.css'
import { ProductSecondaryDrawer } from './secondary/ProductSecondaryDrawer'
import type { CandidateItemPanelContext } from './secondary/secondaryDrawerTypes'

type ProductDrawerSecondaryPaneProps = {
  open: boolean
  summary: ProductPrimarySummary
  selectedStart: string
  selectedEnd: string
  forecastMonths: number
  companyUuid?: string
  selfCompanyLabel: string
  channelsError: ApiUnitErrorInfo | null
  selectedChannelReady: boolean
  selectedChannelMissing: boolean
  secondaryDetail: ProductSecondaryDetail | null
  secondaryDetailError: ApiUnitErrorInfo | null
  hydrateForPanel: OrderSnapshotDocumentV2 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    onChannelChange: (channelId: string) => void
  }
}

function isFiniteCompetitorRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getMissingCompetitorRatioSizes(
  secondaryDetail: ProductSecondaryDetail,
): string[] {
  return secondaryDetail.sizeRows
    .filter((row) => !isFiniteCompetitorRatio(secondaryDetail.competitorRatioBySize[row.size]))
    .map((row) => row.size)
}

function SecondaryPaneStatus({
  children,
  error,
}: {
  children: ReactNode
  error?: ApiUnitErrorInfo | null
}) {
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
  selectedStart,
  selectedEnd,
  forecastMonths,
  companyUuid,
  selfCompanyLabel,
  channelsError,
  selectedChannelReady,
  selectedChannelMissing,
  secondaryDetail,
  secondaryDetailError,
  hydrateForPanel,
  candidateItemContext,
  channelState,
}: ProductDrawerSecondaryPaneProps) {
  const missingCompetitorRatioSizes =
    secondaryDetail == null ? [] : getMissingCompetitorRatioSizes(secondaryDetail)
  let content: ReactNode = null

  if (open) {
    if (channelsError) {
      content = <SecondaryPaneStatus error={channelsError}>경쟁 채널 데이터를 불러오지 못했습니다.</SecondaryPaneStatus>
    } else if (!selectedChannelReady) {
      content = (
        <SecondaryPaneStatus>
          {selectedChannelMissing
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
          primary={summary}
          secondary={secondaryDetail}
          periodStart={selectedStart}
          periodEnd={selectedEnd}
          forecastMonths={forecastMonths}
          companyUuid={companyUuid}
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

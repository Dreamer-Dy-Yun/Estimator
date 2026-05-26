import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { SecondaryCompetitorChannel } from '../../../api/types'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import styles from '../common.module.css'
import { ProductSecondaryDrawer } from './secondary/ProductSecondaryDrawer'
import type { CandidateItemPanelContext } from './secondary/candidateActionCards'

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
  hydrateForPanel: OrderSnapshotDocumentV1 | null
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
  summary: ProductPrimarySummary,
  secondaryDetail: ProductSecondaryDetail,
): string[] {
  return summary.sizeMix
    .filter((row) => !isFiniteCompetitorRatio(secondaryDetail.competitorRatioBySize[row.size]))
    .map((row) => row.size)
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
    secondaryDetail == null ? [] : getMissingCompetitorRatioSizes(summary, secondaryDetail)

  return (
    <div
      className={`${styles.drawerExpandPane} ${open ? styles.drawerExpandPaneOpen : ''}`}
      aria-hidden={!open}
    >
      <div className={styles.drawerExpandPaneInner}>
        {open && (
          channelsError != null ? (
            <div className={styles.drawerSecondaryLoading}>
              경쟁 채널 데이터를 불러오지 못했습니다.
              <ApiUnitErrorBadge error={channelsError} />
            </div>
          ) : !selectedChannelReady ? (
            <div className={styles.drawerSecondaryLoading}>
              {selectedChannelMissing ? (
                '선택된 경쟁 채널이 현재 채널 목록에 없습니다.'
              ) : (
                <LoadingSpinner label="경쟁 채널 데이터를 불러오는 중" />
              )}
            </div>
          ) : secondaryDetailError != null ? (
            <div className={styles.drawerSecondaryLoading}>
              2차 데이터를 불러오지 못했습니다.
              <ApiUnitErrorBadge error={secondaryDetailError} />
            </div>
          ) : secondaryDetail === null ? (
            <div className={styles.drawerSecondaryLoading}>
              <LoadingSpinner label="2차 데이터를 불러오는 중" />
            </div>
          ) : missingCompetitorRatioSizes.length > 0 ? (
            <div className={styles.drawerSecondaryLoading}>
              경쟁사 사이즈 비중 데이터가 누락되어 2차 산출을 표시할 수 없습니다.
              <br />
              누락 사이즈: {missingCompetitorRatioSizes.join(', ')}
            </div>
          ) : (
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
        )}
      </div>
    </div>
  )
}

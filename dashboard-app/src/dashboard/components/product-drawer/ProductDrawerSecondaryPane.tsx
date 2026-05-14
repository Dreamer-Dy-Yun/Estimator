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

export function ProductDrawerSecondaryPane({
  open,
  summary,
  selectedStart,
  selectedEnd,
  forecastMonths,
  channelsError,
  selectedChannelReady,
  selectedChannelMissing,
  secondaryDetail,
  secondaryDetailError,
  hydrateForPanel,
  candidateItemContext,
  channelState,
}: ProductDrawerSecondaryPaneProps) {
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
          ) : (
            <ProductSecondaryDrawer
              primary={summary}
              secondary={secondaryDetail}
              periodStart={selectedStart}
              periodEnd={selectedEnd}
              forecastMonths={forecastMonths}
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

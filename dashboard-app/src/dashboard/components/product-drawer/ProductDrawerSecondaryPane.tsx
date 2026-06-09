import type { OrderSnapshotPrimarySummary } from '../../../snapshot/orderSnapshotTypes'
import type { ProductSecondarySizeRow } from '../../../types'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../api/types'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
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
  targetsError: ApiUnitErrorInfo | null
  targetsLoading: boolean
  selectedComparisonTargetReady: boolean
  selectedComparisonTargetMissing: boolean
  secondaryDetail: ProductSecondaryDetail | null
  secondaryDetailError: ApiUnitErrorInfo | null
  hydrateForPanel: OrderSnapshotDocument | null
  candidateItemContext?: CandidateItemPanelContext | null
  comparisonState: {
    comparisonTarget: ProductComparisonTarget | null
    onComparisonSubjectChange: (next: ProductComparisonTarget) => void
  }
}

function isFiniteComparisonRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getMissingComparisonRatioSizes(
  secondaryDetail: ProductSecondaryDetail,
): string[] {
  return secondaryDetail.sizeRows
    .filter((row: ProductSecondarySizeRow) : boolean => !isFiniteComparisonRatio(secondaryDetail.comparisonRatioBySize[row.size]))
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
  targetsError,
  targetsLoading,
  selectedComparisonTargetReady,
  selectedComparisonTargetMissing,
  secondaryDetail,
  secondaryDetailError,
  hydrateForPanel,
  candidateItemContext,
  comparisonState,
}: ProductDrawerSecondaryPaneProps) : React.JSX.Element {
  const missingComparisonRatioSizes: string[] =
    secondaryDetail == null ? [] : getMissingComparisonRatioSizes(secondaryDetail)
  const primaryForSecondaryPanel: OrderSnapshotPrimarySummary = hydrateForPanel?.drawer1.summary ?? summary
  let content: React.ReactNode = null

  if (open) {
    if (targetsError) {
      content = <SecondaryPaneStatus error={targetsError}>비교 대상 데이터를 불러오지 못했습니다.</SecondaryPaneStatus>
    } else if (!selectedComparisonTargetReady) {
      content = (
        <SecondaryPaneStatus>
          {!targetsLoading && !selectedComparisonTargetMissing
            ? '비교 대상이 없어 2차 드로워를 표시할 수 없습니다.'
            : selectedComparisonTargetMissing
            ? '선택한 비교 대상이 현재 목록에 없습니다.'
            : <LoadingSpinner label="비교 대상 데이터를 불러오는 중" />}
        </SecondaryPaneStatus>
      )
    } else if (secondaryDetailError) {
      content = <SecondaryPaneStatus error={secondaryDetailError}>2차 데이터를 불러오지 못했습니다.</SecondaryPaneStatus>
    } else if (!secondaryDetail) {
      content = <SecondaryPaneStatus><LoadingSpinner label="2차 데이터를 불러오는 중" /></SecondaryPaneStatus>
    } else if (missingComparisonRatioSizes.length > 0) {
      content = (
        <SecondaryPaneStatus>
          비교 대상 사이즈 비중 데이터가 누락되어 2차 예측을 표시할 수 없습니다.
          <br />
          누락 사이즈: {missingComparisonRatioSizes.join(', ')}
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
          comparisonState={comparisonState}
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

import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { FilterBar } from '../FilterBar'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = { model: CandidateStashDetailModalModel; downloadUserName: string }

export function CandidateStashDetailFilters({ model, downloadUserName }: Props) : React.JSX.Element {
  return (
    <>
      {model.candidateItemsLoadError && model.items.length > 0 && <Alert>후보 목록 최신화 실패: {model.candidateItemsLoadError} 기존 목록을 유지합니다.</Alert>}
      {model.recommendationError && <Alert>추천 후보 조회 실패: {model.recommendationError}</Alert>}
      <FilterBar
        title=""
        filterClassName={detailStyles.detailFilterGrid}
        fields={[
          { label: '브랜드', kind: 'listCombo', inputType: 'text', value: model.brandQuery, onChange: model.setBrandQuery, options: model.brandOptions },
          { label: '품번', kind: 'listCombo', inputType: 'text', value: model.codeQuery, onChange: model.setCodeQuery, options: model.codeOptions },
          { label: '상품명', kind: 'listCombo', inputType: 'text', value: model.productNameQuery, onChange: model.setProductNameQuery, options: model.productNameOptions },
        ]}
        filterEndContent={
          <div className={detailStyles.detailFilterActionCell}>
            <button type="button" className={detailStyles.orderExcelDownloadBtn} onClick={() : undefined => void model.downloadOrderExcel(downloadUserName)} disabled={model.candidateItemsLoading || model.orderExportBusy || model.items.length === 0 || model.pendingOrderMetricCount > 0}>
              {model.orderExportBusy ? <LoadingSpinner size="inline" label="생성 중" /> : model.pendingOrderMetricCount > 0 ? <LoadingSpinner size="inline" label="오더 지표 계산 중" /> : '엑셀 다운로드'}
            </button>
          </div>
        }
      />
      {model.orderExportError && <Alert>엑셀 다운로드 실패: {model.orderExportError}</Alert>}
    </>
  )
}

function Alert({ children }: { children: React.ReactNode }) : React.JSX.Element {
  return <div className={detailStyles.orderExportError} role="alert">{children}</div>
}

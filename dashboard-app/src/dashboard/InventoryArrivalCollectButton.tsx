import { useState } from 'react'
import { collectInventoryArrivalDates, type InventoryArrivalCollectionResult } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import styles from './layout.module.css'

function getCollectErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '입고예정일 수집 중 오류가 발생했습니다.'
}

function formatCollectResultMessage(result: InventoryArrivalCollectionResult) {
  if (result.failedCount > 0) {
    return `입고예정일 ${result.collectedCount}건 수집, ${result.failedCount}건 실패`
  }
  return `입고예정일 ${result.collectedCount}건 수집 완료`
}

export function InventoryArrivalCollectButton() {
  const { showToast } = useAppToast()
  const [collecting, setCollecting] = useState(false)

  const handleClick = async () => {
    if (collecting) return
    setCollecting(true)
    try {
      const result = await collectInventoryArrivalDates()
      const variant = result.status === 'failed'
        ? 'error'
        : result.failedCount > 0
          ? 'info'
          : 'success'
      showToast(formatCollectResultMessage(result), { variant })
    } catch (error) {
      showToast(getCollectErrorMessage(error), { variant: 'error', durationMs: 4200 })
    } finally {
      setCollecting(false)
    }
  }

  return (
    <button
      className={styles.utilityButton}
      type="button"
      disabled={collecting}
      onClick={handleClick}
      aria-busy={collecting}
    >
      {collecting ? (
        <LoadingSpinner label="입고예정일 수집 중" size="inline" showLabel={false} />
      ) : null}
      <span>입고예정일 수집</span>
    </button>
  )
}

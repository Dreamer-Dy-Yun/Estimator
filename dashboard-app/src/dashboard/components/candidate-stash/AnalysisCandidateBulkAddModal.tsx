import { useEffect, useMemo, useRef, useState } from 'react'
import {
  appendCandidateItems,
  createCandidateStash,
  getCandidateStashes,
  type CandidateStashSummary,
} from '../../../api'
import { useAppToast } from '../../../components/AppToastContext'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatDateTimeMinute } from '../../../utils/date'
import styles from '../common.module.css'

type Props = {
  open: boolean
  skuGroupKeys: string[]
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onClose: () => void
  onDone: () => void
}

export function AnalysisCandidateBulkAddModal({
  open,
  skuGroupKeys,
  periodStart,
  periodEnd,
  forecastMonths,
  onClose,
  onDone,
}: Props) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [selectedStashUuid, setSelectedStashUuid] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSeqRef = useRef(0)
  const { showToast } = useAppToast()
  const uniqueSkuGroupKeys = useMemo(() => [...new Set(skuGroupKeys)], [skuGroupKeys])

  useEffect(() => {
    if (!open) return
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    setBusy(true)
    setError(null)
    void getCandidateStashes()
      .then((rows) => {
        if (requestSeqRef.current !== seq) return
        setStashes(rows)
        setSelectedStashUuid((current) => current || rows[0]?.uuid || '')
      })
      .catch((err) => {
        if (requestSeqRef.current !== seq) return
        setError(err instanceof Error ? err.message : '후보군 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (requestSeqRef.current === seq) setBusy(false)
      })
  }, [open])

  if (!open) return null

  const createAndSelect = async () => {
    setBusy(true)
    setError(null)
    try {
      const created = await createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        periodStart,
        periodEnd,
        forecastMonths,
      })
      setStashes((prev) => [created, ...prev])
      setSelectedStashUuid(created.uuid)
      setNameInput('')
      setNoteInput('')
      showToast('후보군을 생성했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '후보군 생성에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!selectedStashUuid || uniqueSkuGroupKeys.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await appendCandidateItems({
        stashUuid: selectedStashUuid,
        skuGroupKeys: uniqueSkuGroupKeys,
      })
      showToast('선택한 상품을 후보군에 담았습니다.')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택 상품을 후보군에 담지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-candidate-bulk-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="analysis-candidate-bulk-title">선택 상품 후보군 담기</h3>
          <button
            type="button"
            className={styles.iconCloseButton}
            onClick={onClose}
            aria-label="후보군 담기 닫기"
          />
        </div>

        <div className={styles.analysisBulkMeta}>
          선택 상품 <b>{uniqueSkuGroupKeys.length}</b>개
        </div>

        <div className={styles.analysisBulkCreateGrid}>
          <label className={styles.field}>
            <span>후보군 이름</span>
            <input
              type="text"
              value={nameInput}
              placeholder="새 후보군 이름"
              onChange={(event) => setNameInput(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>비고</span>
            <input
              type="text"
              value={noteInput}
              placeholder="후보군 비고"
              onChange={(event) => setNoteInput(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnNeutral}`}
            onClick={() => void createAndSelect()}
            disabled={busy}
          >
            {busy ? <LoadingSpinner size="inline" label="처리 중" /> : '후보군 생성'}
          </button>
        </div>

        <div className={styles.analysisBulkStashList}>
          {busy && stashes.length === 0 ? (
            <LoadingSpinner label="후보군 목록을 불러오는 중" />
          ) : stashes.length === 0 ? (
            <div className={styles.analysisBulkEmpty}>선택 가능한 후보군이 없습니다. 위에서 새 후보군을 생성하세요.</div>
          ) : (
            stashes.map((stash) => (
              <button
                key={stash.uuid}
                type="button"
                className={`${styles.analysisBulkStashItem} ${
                  selectedStashUuid === stash.uuid ? styles.analysisBulkStashItemSelected : ''
                }`}
                disabled={busy}
                onClick={() => setSelectedStashUuid(stash.uuid)}
              >
                <span>{stash.name}</span>
                <small>
                  {stash.note?.trim() || '비고 없음'} · 생성 {formatDateTimeMinute(stash.dbCreatedAt)}
                </small>
              </button>
            ))
          )}
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        <div className={styles.modalActions}>
          <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnPrimary}`}
            onClick={() => void confirm()}
            disabled={busy || !selectedStashUuid || uniqueSkuGroupKeys.length === 0}
          >
            {busy ? <LoadingSpinner size="inline" label="담는 중" /> : '담기'}
          </button>
        </div>
      </section>
    </div>
  )
}

import type { AppendCandidateItemsResponse } from '../../../api'
import { useEffect, useMemo, useRef, useState } from 'react'
import { appendCandidateItems, createCandidateStash, getCandidateStashes, type CandidateStashSummary } from '../../../api'
import { useAppToast } from '../../../components/AppToastContext'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatDateTimeMinute } from '../../../utils/date'
import styles from '../common.module.css'

export type Props = {
  open: boolean
  skuGroupKeys: string[]
  periodStart: string
  periodEnd: string
  companyUuid?: string
  competitorChannelId?: string
  forecastMonths: number
  onClose: () => void
  onDone: () => void
}

const COMPANY_REQUIRED_MESSAGE = '후보군 추가는 회사 선택이 필요합니다.' as const

export function AnalysisCandidateBulkAddModal({ open, skuGroupKeys, periodStart, periodEnd, companyUuid, competitorChannelId, forecastMonths, onClose, onDone }: Props) : React.JSX.Element | null {
  const [stashes, setStashes]: [CandidateStashSummary[], React.Dispatch<React.SetStateAction<CandidateStashSummary[]>>] = useState<CandidateStashSummary[]>([])
  const [selectedStashUuid, setSelectedStashUuid]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [nameInput, setNameInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [noteInput, setNoteInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [busy, setBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [error, setError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const requestSeqRef: React.RefObject<number> = useRef(0)
  const mutationSeqRef: React.RefObject<number> = useRef(0)
  const currentScopeRef: React.RefObject<{ open: boolean; companyUuid: string | undefined; selectedStashUuid: string; }> = useRef({ open, companyUuid, selectedStashUuid })
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const uniqueSkuGroupKeys: string[] = useMemo(() : string[] => [...new Set(skuGroupKeys)], [skuGroupKeys])

  useEffect(() : void => {
    currentScopeRef.current = { open, companyUuid, selectedStashUuid }
  }, [companyUuid, open, selectedStashUuid])

  useEffect(() : (() => void) | undefined => {
    if (!open) return
    const seq: number = requestSeqRef.current + 1
    requestSeqRef.current = seq
    queueMicrotask(() : void => {
      if (requestSeqRef.current !== seq) return
      setBusy(true)
      setError(null)
      void getCandidateStashes({ companyUuid })
        .then((rows: CandidateStashSummary[]) : void => {
          if (requestSeqRef.current !== seq) return
          setStashes(rows)
          setSelectedStashUuid((current: string) : string => rows.some((row: CandidateStashSummary) : boolean => row.uuid === current) ? current : rows[0]?.uuid || '')
        })
        .catch((err: unknown) : void => {
          if (requestSeqRef.current === seq) setError(errorMessage(err, '후보군 목록을 불러오지 못했습니다.'))
        })
        .finally(() : void => {
          if (requestSeqRef.current === seq) setBusy(false)
        })
    })
    return () : void => {
      requestSeqRef.current += 1
      mutationSeqRef.current += 1
    }
  }, [companyUuid, open])

  if (!open) return null

  const requireCompany: () => string | null = () : string | null => {
    if (companyUuid) return companyUuid
    setError(COMPANY_REQUIRED_MESSAGE)
    return null
  }

  const beginMutation: () => number = () : number => {
    const seq: number = mutationSeqRef.current + 1
    mutationSeqRef.current = seq
    return seq
  }

  const isCurrentMutation: (seq: number, snapshot: { companyUuid: string; selectedStashUuid?: string; }) => boolean = (
    seq: number,
    snapshot: { companyUuid: string; selectedStashUuid?: string },
  ) : boolean => {
    const current: { open: boolean; companyUuid: string | undefined; selectedStashUuid: string; } = currentScopeRef.current
    return current.open
      && mutationSeqRef.current === seq
      && current.companyUuid === snapshot.companyUuid
      && (snapshot.selectedStashUuid == null || current.selectedStashUuid === snapshot.selectedStashUuid)
  }

  const createAndSelect: () => Promise<void> = async () : Promise<void> => {
    const mutationCompanyUuid: string | null = requireCompany()
    if (!mutationCompanyUuid) return
    const seq: number = beginMutation()
    setBusy(true)
    setError(null)
    try {
      const created: CandidateStashSummary = await createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid: mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      if (!isCurrentMutation(seq, { companyUuid: mutationCompanyUuid })) return
      setStashes((prev: CandidateStashSummary[]) : CandidateStashSummary[] => [created, ...prev])
      setSelectedStashUuid(created.uuid)
      setNameInput('')
      setNoteInput('')
      showToast('\uD6C4\uBCF4\uAD70\uC744 \uC0DD\uC131\uD588\uC2B5\uB2C8\uB2E4.')
    } catch (err) {
      if (isCurrentMutation(seq, { companyUuid: mutationCompanyUuid })) {
        setError(errorMessage(err, '\uD6C4\uBCF4\uAD70 \uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'))
      }
    } finally {
      if (isCurrentMutation(seq, { companyUuid: mutationCompanyUuid })) setBusy(false)
    }
  }

  const confirm: () => Promise<void> = async () : Promise<void> => {
    const mutationCompanyUuid: string | null = requireCompany()
    if (!selectedStashUuid || !uniqueSkuGroupKeys.length || !mutationCompanyUuid) return
    const targetStashUuid: string = selectedStashUuid
    const seq: number = beginMutation()
    setBusy(true)
    setError(null)
    try {
      const result: AppendCandidateItemsResponse = await appendCandidateItems({ stashUuid: targetStashUuid, companyUuid: mutationCompanyUuid, competitorChannelId, skuGroupKeys: uniqueSkuGroupKeys })
      if (!isCurrentMutation(seq, { companyUuid: mutationCompanyUuid, selectedStashUuid: targetStashUuid })) return
      const appendedCount: number = result.candidateItems.length
      const skippedCount: number = Math.max(0, uniqueSkuGroupKeys.length - appendedCount)
      if (appendedCount <= 0) {
        showToast('\uC120\uD0DD \uC0C1\uD488\uC740 \uC774\uBBF8 \uD6C4\uBCF4\uAD70\uC5D0 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.', { variant: 'warning' })
        onDone()
        return
      }
      showToast(skippedCount > 0
        ? '\uC120\uD0DD \uC0C1\uD488 ' + appendedCount + '\uAC1C\uB97C \uD6C4\uBCF4\uAD70\uC5D0 \uB354\uD588\uC2B5\uB2C8\uB2E4. ' + skippedCount + '\uAC1C\uB294 \uC774\uBBF8 \uD3EC\uD568\uB418\uC5B4 \uAC74\uB108\uB6F0\uC5C8\uC2B5\uB2C8\uB2E4.'
        : '\uC120\uD0DD \uC0C1\uD488 ' + appendedCount + '\uAC1C\uB97C \uD6C4\uBCF4\uAD70\uC5D0 \uB354\uD588\uC2B5\uB2C8\uB2E4.')
      onDone()
    } catch (err) {
      if (isCurrentMutation(seq, { companyUuid: mutationCompanyUuid, selectedStashUuid: targetStashUuid })) {
        setError(errorMessage(err, '\uC120\uD0DD \uC0C1\uD488\uC744 \uD6C4\uBCF4\uAD70\uC5D0 \uB354\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'))
      }
    } finally {
      if (isCurrentMutation(seq, { companyUuid: mutationCompanyUuid, selectedStashUuid: targetStashUuid })) {
        setBusy(false)
      }
    }
  }
  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section className={styles.modalPanel} role="dialog" aria-modal="true" aria-labelledby="analysis-candidate-bulk-title" onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 id="analysis-candidate-bulk-title">선택 상품 후보군 담기</h3>
          <button type="button" className={styles.iconCloseButton} onClick={onClose} aria-label="후보군 담기 닫기" />
        </div>
        <div className={styles.analysisBulkMeta}>선택 상품 <b>{uniqueSkuGroupKeys.length}</b>개</div>
        <div className={styles.analysisBulkCreateGrid}>
          <TextField label="후보군 이름" value={nameInput} placeholder="새 후보군 이름" onChange={setNameInput} />
          <TextField label="비고" value={noteInput} placeholder="후보군 비고" onChange={setNoteInput} />
          <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={() : undefined => void createAndSelect()} disabled={busy}>
            {busy ? <LoadingSpinner size="inline" label="처리 중" /> : '후보군 생성'}
          </button>
        </div>
        <div className={styles.analysisBulkStashList}>
          {busy && !stashes.length ? <LoadingSpinner label="후보군 목록을 불러오는 중" />
            : !stashes.length ? <div className={styles.analysisBulkEmpty}>선택 가능한 후보군이 없습니다. 위에서 새 후보군을 생성하세요.</div>
            : stashes.map((stash: CandidateStashSummary) : React.JSX.Element => (
              <button key={stash.uuid} type="button" className={`${styles.analysisBulkStashItem} ${selectedStashUuid === stash.uuid ? styles.analysisBulkStashItemSelected : ''}`} disabled={busy} onClick={() : void => setSelectedStashUuid(stash.uuid)}>
                <span>{stash.name}</span>
                <small>{stash.note?.trim() || '비고 없음'} · 생성 {formatDateTimeMinute(stash.dbCreatedAt)}</small>
              </button>
            ))}
        </div>
        {error && <div className={styles.modalError}>{error}</div>}
        <div className={styles.modalActions}>
          <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={onClose}>취소</button>
          <button type="button" className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() : undefined => void confirm()} disabled={busy || !selectedStashUuid || !uniqueSkuGroupKeys.length}>
            {busy ? <LoadingSpinner size="inline" label="담는 중" /> : '담기'}
          </button>
        </div>
      </section>
    </div>
  )
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) : React.JSX.Element {
  return <label className={styles.field}><span>{label}</span><input type="text" value={value} placeholder={placeholder} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => onChange(event.target.value)} /></label>
}

function errorMessage(err: unknown, fallback: string) : string {
  return err instanceof Error ? err.message : fallback
}

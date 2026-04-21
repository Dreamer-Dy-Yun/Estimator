import { useEffect, useMemo, useState } from 'react'
import { deleteCandidateStash, getCandidateItemsByStash, getCandidateStashes, type CandidateItemSummary, type CandidateStashSummary } from '../../api'
import styles from '../components/common.module.css'
import pageStyles from './SnapshotConfirmPage.module.css'
import { FilterBar } from '../components/FilterBar'
import { PageHeader } from '../components/PageHeader'

const fmtNumber = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.round(v)))
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}

const toTime = (iso: string) => {
  const ts = new Date(iso).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

export const SnapshotConfirmPage = () => {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [itemsByStash, setItemsByStash] = useState<Record<string, CandidateItemSummary[]>>({})
  const [detailTarget, setDetailTarget] = useState<CandidateStashSummary | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CandidateStashSummary | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [stashNameQuery, setStashNameQuery] = useState('')
  const [stashNoteQuery, setStashNoteQuery] = useState('')
  const [stashSortKey, setStashSortKey] = useState<'createdDesc' | 'createdAsc' | 'updatedDesc' | 'updatedAsc'>('createdDesc')
  const [brandQuery, setBrandQuery] = useState('')
  const [productCodeQuery, setProductCodeQuery] = useState('')
  const [productNameQuery, setProductNameQuery] = useState('')
  const [sortKey, setSortKey] = useState<'qtyDesc' | 'qtyAsc' | 'salesDesc' | 'salesAsc'>('qtyDesc')

  const loadStashes = async () => {
    const list = await getCandidateStashes()
    setStashes(list)
  }

  useEffect(() => {
    void loadStashes()
  }, [])

  const filteredStashes = useMemo(() => {
    const nq = stashNameQuery.trim().toLowerCase()
    const noteQ = stashNoteQuery.trim().toLowerCase()
    const filtered = stashes.filter((stash) => {
      if (nq && !stash.name.toLowerCase().includes(nq)) return false
      if (noteQ && !(stash.note ?? '').toLowerCase().includes(noteQ)) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      if (stashSortKey === 'createdDesc') return toTime(b.dbCreatedAt) - toTime(a.dbCreatedAt)
      if (stashSortKey === 'createdAsc') return toTime(a.dbCreatedAt) - toTime(b.dbCreatedAt)
      if (stashSortKey === 'updatedDesc') return toTime(b.dbUpdatedAt) - toTime(a.dbUpdatedAt)
      return toTime(a.dbUpdatedAt) - toTime(b.dbUpdatedAt)
    })
  }, [stashNameQuery, stashNoteQuery, stashSortKey, stashes])

  return (
    <section className={styles.page}>
      <PageHeader title="" badge="" />

      <FilterBar
        title=""
        fields={[
          {
            label: '이름 검색',
            kind: 'input',
            inputType: 'text',
            value: stashNameQuery,
            onChange: setStashNameQuery,
          },
          {
            label: '비고 검색',
            kind: 'input',
            inputType: 'text',
            value: stashNoteQuery,
            onChange: setStashNoteQuery,
          },
          {
            label: '정렬',
            kind: 'select',
            value:
              stashSortKey === 'createdDesc'
                ? '생성일 최신순'
                : stashSortKey === 'createdAsc'
                  ? '생성일 오래된순'
                  : stashSortKey === 'updatedDesc'
                    ? '변경일 최신순'
                    : '변경일 오래된순',
            onChange: (v) => {
              if (v === '생성일 최신순') setStashSortKey('createdDesc')
              else if (v === '생성일 오래된순') setStashSortKey('createdAsc')
              else if (v === '변경일 최신순') setStashSortKey('updatedDesc')
              else setStashSortKey('updatedAsc')
            },
            options: ['생성일 최신순', '생성일 오래된순', '변경일 최신순', '변경일 오래된순'],
          },
        ]}
      />

      {!stashes.length ? (
        <div className={styles.card}>저장된 오더 후보군이 없습니다.</div>
      ) : !filteredStashes.length ? (
        <div className={styles.card}>검색 조건에 맞는 후보군이 없습니다.</div>
      ) : (
        <div className={pageStyles.stashList}>
          {filteredStashes.map((stash) => {
            return (
              <div key={stash.uuid} className={`${styles.card} ${pageStyles.stashCard}`}>
                <div className={pageStyles.stashCardRow}>
                  <button
                    type="button"
                    onClick={async () => {
                      setDetailTarget(stash)
                      if (itemsByStash[stash.uuid] != null) return
                      setDetailLoading(true)
                      try {
                        const rows = await getCandidateItemsByStash(stash.uuid)
                        setItemsByStash((prev) => ({ ...prev, [stash.uuid]: rows }))
                      } finally {
                        setDetailLoading(false)
                      }
                    }}
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div className={pageStyles.stashInfoGrid}>
                      <div className={pageStyles.stashLeftTop}>
                        <strong className={pageStyles.stashName}>{stash.name}</strong>
                        <span className={pageStyles.stashMetaDot}>·</span>
                        <span className={pageStyles.stashMeta}>등록 상품 {stash.itemCount}건</span>
                      </div>
                      <span className={pageStyles.stashMetaRight}>생성일: {fmtDateTime(stash.dbCreatedAt)}</span>
                      <span className={pageStyles.stashNote}>{stash.note?.trim() ? stash.note : '-'}</span>
                      <span className={pageStyles.stashMetaRight}>변경일: {fmtDateTime(stash.dbUpdatedAt)}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`${pageStyles.actionBtn} ${pageStyles.btnDelete}`}
                    onClick={() => setDeleteTarget(stash)}
                    aria-label={`${stash.name} 삭제`}
                    title="삭제"
                  >
                    <span className={pageStyles.trashIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 3.5h6a1 1 0 0 1 1 1V6h3a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8H5a1 1 0 1 1 0-2h3V4.5a1 1 0 0 1 1-1Zm1 2V6h4V5.5h-4ZM8 8v11h8V8H8Zm2 2a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z" />
                      </svg>
                    </span>
                    <span>삭제</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailTarget && (
        <div
          onClick={() => {
            setDetailTarget(null)
            setBrandQuery('')
            setProductCodeQuery('')
            setProductNameQuery('')
          }}
          className={pageStyles.detailOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.card}
            style={{ width: 'min(980px, 86vw)', height: 'min(760px, 78vh)', overflow: 'hidden' }}
          >
            <div className={pageStyles.detailDialog}>
              <div className={pageStyles.detailHeader}>
                <div className={pageStyles.detailHeaderText}>
                  <h3 className={pageStyles.detailTitle}>{detailTarget.name}</h3>
                  <span className={pageStyles.detailSub}>
                  생성일: {fmtDateTime(detailTarget.dbCreatedAt)} · 변경일: {fmtDateTime(detailTarget.dbUpdatedAt)} · 등록 상품 {detailTarget.itemCount}건
                  </span>
                </div>
                <button
                  type="button"
                  className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
                  onClick={() => {
                    setDetailTarget(null)
                    setBrandQuery('')
                    setProductCodeQuery('')
                    setProductNameQuery('')
                  }}
                >
                  닫기
                </button>
              </div>
              {detailTarget.note && (
                <div className={pageStyles.detailNote}>{detailTarget.note}</div>
              )}
              <div className={pageStyles.detailBody}>
                <div className={pageStyles.filterBar}>
                  <input
                    type="text"
                    className={styles.control}
                    placeholder="브랜드 검색"
                    value={brandQuery}
                    onChange={(e) => setBrandQuery(e.target.value)}
                    style={{ minHeight: 34 }}
                  />
                  <input
                    type="text"
                    className={styles.control}
                    placeholder="상품코드 검색"
                    value={productCodeQuery}
                    onChange={(e) => setProductCodeQuery(e.target.value)}
                    style={{ minHeight: 34 }}
                  />
                  <input
                    type="text"
                    className={styles.control}
                    placeholder="상품명 검색"
                    value={productNameQuery}
                    onChange={(e) => setProductNameQuery(e.target.value)}
                    style={{ minHeight: 34 }}
                  />
                  <select
                    className={styles.control}
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                    style={{ minHeight: 34 }}
                  >
                    <option value="qtyDesc">수량 내림차순</option>
                    <option value="qtyAsc">수량 오름차순</option>
                    <option value="salesDesc">예상 매출 내림차순</option>
                    <option value="salesAsc">예상 매출 오름차순</option>
                  </select>
                </div>
                <div className={pageStyles.itemList}>
                  {detailLoading ? (
                    <div className={pageStyles.emptyState}>후보군 상품을 불러오는 중...</div>
                  ) : (
                    (() => {
                      const filtered = (itemsByStash[detailTarget.uuid] ?? []).filter((item) => {
                        const bq = brandQuery.trim().toLowerCase()
                        const cq = productCodeQuery.trim().toLowerCase()
                        const nq = productNameQuery.trim().toLowerCase()
                        if (bq && !item.brand.toLowerCase().includes(bq)) return false
                        if (cq && !item.productCode.toLowerCase().includes(cq)) return false
                        if (nq && !item.productName.toLowerCase().includes(nq)) return false
                        return true
                      })
                      const sorted = [...filtered].sort((a, b) => {
                        if (sortKey === 'qtyDesc') return b.qty - a.qty
                        if (sortKey === 'qtyAsc') return a.qty - b.qty
                        if (sortKey === 'salesDesc') return b.expectedSalesAmount - a.expectedSalesAmount
                        return a.expectedSalesAmount - b.expectedSalesAmount
                      })
                      if (!filtered.length) {
                        return (
                          <div className={pageStyles.emptyState}>
                            {brandQuery.trim() || productCodeQuery.trim() || productNameQuery.trim()
                              ? '검색 결과가 없습니다.'
                              : '등록된 상품이 없습니다.'}
                          </div>
                        )
                      }
                      return sorted.map((item) => (
                        <article key={item.uuid} className={pageStyles.itemCard}>
                          <div className={pageStyles.itemTop}>
                            <span className={pageStyles.itemBrand}>{item.brand}</span>
                            <span className={pageStyles.itemDate}>등록: {fmtDateTime(item.dbCreatedAt)}</span>
                          </div>
                          <strong className={pageStyles.itemCode}>{item.productCode}</strong>
                          <p className={pageStyles.itemName}>{item.productName}</p>
                          <div className={pageStyles.itemMetrics}>
                            <span>수량: {fmtNumber(item.qty)} EA</span>
                            <span>예상 매출: {fmtNumber(item.expectedSalesAmount)} 원</span>
                          </div>
                        </article>
                      ))
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          onClick={() => !deleteBusy && setDeleteTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.card}
            style={{ width: 'min(420px, 100%)', display: 'grid', gap: 10 }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>삭제 확인</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
              <b>{deleteTarget.name}</b> 후보군을 삭제할까요?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                취소
              </button>
              <button
                type="button"
                className={`${pageStyles.actionBtn} ${pageStyles.btnDangerSolid}`}
                disabled={deleteBusy}
                aria-label="후보군 삭제"
                title="삭제"
                onClick={async () => {
                  setDeleteBusy(true)
                  try {
                    await deleteCandidateStash(deleteTarget.uuid)
                    setDeleteTarget(null)
                    setDetailTarget((prev) => (prev?.uuid === deleteTarget.uuid ? null : prev))
                    setItemsByStash((prev) => {
                      const { [deleteTarget.uuid]: _removed, ...rest } = prev
                      return rest
                    })
                    await loadStashes()
                  } finally {
                    setDeleteBusy(false)
                  }
                }}
              >
                {deleteBusy ? '삭제 중…' : (
                  <>
                    <span className={pageStyles.trashIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 3.5h6a1 1 0 0 1 1 1V6h3a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8H5a1 1 0 1 1 0-2h3V4.5a1 1 0 0 1 1-1Zm1 2V6h4V5.5h-4ZM8 8v11h8V8H8Zm2 2a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z" />
                      </svg>
                    </span>
                    <span>삭제</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


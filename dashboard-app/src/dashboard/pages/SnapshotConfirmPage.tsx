import { useEffect, useMemo, useState } from 'react'
import { getSecondaryOrderSnapshots, type OrderSnapshotDocumentV1 } from '../../api'
import styles from '../components/common.module.css'
import { PageHeader } from '../components/PageHeader'

type SnapshotGroup = {
  productCode: string
  productName: string
  productId: string
  latestSavedAt: string
  snapshots: OrderSnapshotDocumentV1[]
}

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

export const SnapshotConfirmPage = () => {
  const [rows, setRows] = useState<OrderSnapshotDocumentV1[]>([])
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<OrderSnapshotDocumentV1 | null>(null)

  useEffect(() => {
    getSecondaryOrderSnapshots().then(setRows)
  }, [])

  const groups = useMemo<SnapshotGroup[]>(() => {
    const m = new Map<string, SnapshotGroup>()
    rows.forEach((snap) => {
      const productCode = snap.drawer1?.summary?.productCode ?? snap.productId
      const existing = m.get(productCode)
      if (!existing) {
        m.set(productCode, {
          productCode,
          productName: snap.drawer1?.summary?.name ?? '(상품명 없음)',
          productId: snap.productId,
          latestSavedAt: snap.savedAt,
          snapshots: [snap],
        })
        return
      }
      existing.snapshots.push(snap)
      if (existing.latestSavedAt < snap.savedAt) existing.latestSavedAt = snap.savedAt
    })
    return Array.from(m.values())
      .map((g) => ({ ...g, snapshots: [...g.snapshots].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))) }))
      .sort((a, b) => String(b.latestSavedAt).localeCompare(String(a.latestSavedAt)))
  }, [rows])

  return (
    <section className={styles.page}>
      <PageHeader title="스냅샷 확정" badge="Snapshot" />

      {!groups.length ? (
        <div className={styles.card}>저장된 스냅샷이 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {groups.map((g) => {
            const opened = expandedCode === g.productCode
            return (
              <div key={g.productCode} className={styles.card}>
                <button
                  type="button"
                  onClick={() => setExpandedCode((prev) => (prev === g.productCode ? null : g.productCode))}
                  style={{
                    width: '100%',
                    border: 0,
                    background: 'transparent',
                    textAlign: 'left',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <strong>{g.productCode}</strong>
                  <span style={{ color: '#334155', fontSize: 13 }}>{g.productName}</span>
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    최신 스냅샷: {fmtDateTime(g.latestSavedAt)} · 총 {g.snapshots.length}건
                  </span>
                </button>

                {opened && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'grid', gap: 8 }}>
                    {g.snapshots.map((snap) => (
                      <button
                        key={`${g.productCode}-${snap.savedAt}`}
                        type="button"
                        onClick={() => setSelectedSnapshot(snap)}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          background: '#fff',
                          padding: '8px 10px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDateTime(snap.savedAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedSnapshot && (
        <div
          onClick={() => setSelectedSnapshot(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 96vw)',
              height: '100%',
              background: '#fff',
              overflow: 'auto',
              padding: 16,
              boxSizing: 'border-box',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>스냅샷 상세</h3>
              <button type="button" className={styles.iconBtn} onClick={() => setSelectedSnapshot(null)}>닫기</button>
            </div>
            <div className={styles.card}>
              <div><b>저장 일시:</b> {fmtDateTime(selectedSnapshot.savedAt)}</div>
              <div><b>상품 코드:</b> {selectedSnapshot.drawer1.summary.productCode}</div>
              <div><b>상품명:</b> {selectedSnapshot.drawer1.summary.name}</div>
            </div>
            <div className={styles.card}>
              <b>1차 요약</b>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                {JSON.stringify(selectedSnapshot.drawer1, null, 2)}
              </pre>
            </div>
            <div className={styles.card}>
              <b>2차 내용</b>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                {JSON.stringify(selectedSnapshot.drawer2, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}


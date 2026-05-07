import { CANDIDATE_ITEM_STORAGE_KEY, CANDIDATE_STASH_STORAGE_KEY } from './constants'
import { DEFAULT_CANDIDATE_STASH_CONTEXT, type CandidateItemRecord, type CandidateStashRecord } from './records'
import {
  buildMockOrderSnapshotForCandidate,
  ensureMockAiCommentForSnapshot,
} from './orderSnapshotForCandidate'

const seededCandidateStashes: CandidateStashRecord[] = [
  {
    uuid: 'candidatestash00000000000000000001',
    name: '기본 후보군 A',
    note: '초기 목업 데이터',
    productId: 'B',
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T09:00:00.000Z',
    dbUpdatedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000002',
    name: '봄 시즌 후보군',
    note: '가격 민감도 높은 구성',
    productId: 'B',
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T10:30:00.000Z',
    dbUpdatedAt: '2026-04-20T10:30:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000003',
    name: '기본 후보군 D',
    note: '의류 카테고리 기본안',
    productId: 'D',
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T11:00:00.000Z',
    dbUpdatedAt: '2026-04-20T11:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000004',
    name: '기본 후보군 H',
    note: '신발 프리미엄 라인',
    productId: 'H',
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T11:20:00.000Z',
    dbUpdatedAt: '2026-04-20T11:20:00.000Z',
  },
  ...Array.from({ length: 30 }, (_, i) => {
    const idx = i + 1
    const minute = String((i * 3) % 60).padStart(2, '0')
    const hour = String(12 + Math.floor((i * 3) / 60)).padStart(2, '0')
    const createdAt = `2026-04-21T${hour}:${minute}:00.000Z`
    const updatedMinute = String((i * 3 + 2) % 60).padStart(2, '0')
    const updatedHour = String(12 + Math.floor((i * 3 + 2) / 60)).padStart(2, '0')
    const updatedAt = `2026-04-21T${updatedHour}:${updatedMinute}:00.000Z`
    const products = ['B', 'D', 'H', 'J', 'F', 'K', 'L', 'M']
    return {
      uuid: `candidate-stash-seed-${String(idx).padStart(2, '0')}`,
      name: `스크롤 테스트 후보군 ${String(idx).padStart(2, '0')}`,
      note: idx % 3 === 0 ? '스크롤/정렬/검색 검증용 샘플' : '대량 후보군 UI 검증',
      productId: products[i % products.length]!,
      ...DEFAULT_CANDIDATE_STASH_CONTEXT,
      dbCreatedAt: createdAt,
      dbUpdatedAt: updatedAt,
    }
  }),
]
const seededCandidateItemDrafts: Array<Omit<CandidateItemRecord, 'isLatestLlmComment'>> = [
  {
    uuid: 'candidateitem000000000000000000001',
    stashUuid: 'candidatestash00000000000000000001',
    skuUuid: 'B',
    details: buildMockOrderSnapshotForCandidate('B'),
    dbCreatedAt: '2026-04-20T09:10:00.000Z',
    dbUpdatedAt: '2026-04-20T09:10:00.000Z',
  },
  /** 기본 후보군 A(01) — 이너 9건: 목록·필터·스크롤·정렬 */
  ...(
    [
      ['005', 'D', '09:12:00.000Z', '09:13:00.000Z'],
      ['006', 'H', '09:14:00.000Z', '09:15:30.000Z'],
      ['007', 'J', '09:16:00.000Z', '09:16:00.000Z'],
      ['008', 'F', '09:18:00.000Z', '09:19:00.000Z'],
      ['009', 'K', '09:20:00.000Z', '09:21:00.000Z'],
      ['010', 'L', '09:22:00.000Z', '09:22:00.000Z'],
      ['011', 'M', '09:24:00.000Z', '09:25:10.000Z'],
      ['012', 'B', '09:26:00.000Z', '09:27:00.000Z'],
    ] as const
  ).map(([suffix, pid, created, updated]) => ({
    uuid: `candidateitem000000000000000000${suffix}`,
    stashUuid: 'candidatestash00000000000000000001',
    skuUuid: pid,
    details: buildMockOrderSnapshotForCandidate(pid),
    dbCreatedAt: `2026-04-20T${created}`,
    dbUpdatedAt: `2026-04-20T${updated}`,
  })),
  {
    uuid: 'candidateitem000000000000000000002',
    stashUuid: 'candidatestash00000000000000000002',
    skuUuid: 'B',
    details: buildMockOrderSnapshotForCandidate('B'),
    dbCreatedAt: '2026-04-20T10:40:00.000Z',
    dbUpdatedAt: '2026-04-20T10:40:00.000Z',
  },
  /** 봄 시즌 후보군(02) — 이너 5건 이상(기존 1 + 아래 4) */
  ...(
    [
      ['innerstash02item0000000000000001', 'D', '10:41:05.000Z', '10:41:05.000Z'],
      ['innerstash02item0000000000000002', 'H', '10:41:10.000Z', '10:41:10.000Z'],
      ['innerstash02item0000000000000003', 'J', '10:41:15.000Z', '10:41:15.000Z'],
      ['innerstash02item0000000000000004', 'N', '10:41:20.000Z', '10:41:20.000Z'],
    ] as const
  ).map(([uuid, pid, created, updated]) => ({
    uuid,
    stashUuid: 'candidatestash00000000000000000002',
    skuUuid: pid,
    details: buildMockOrderSnapshotForCandidate(pid),
    dbCreatedAt: `2026-04-20T${created}`,
    dbUpdatedAt: `2026-04-20T${updated}`,
  })),
  {
    uuid: 'candidateitem000000000000000000003',
    stashUuid: 'candidatestash00000000000000000003',
    skuUuid: 'D',
    details: buildMockOrderSnapshotForCandidate('D'),
    dbCreatedAt: '2026-04-20T11:10:00.000Z',
    dbUpdatedAt: '2026-04-20T11:10:00.000Z',
  },
  {
    uuid: 'candidateitem000000000000000000004',
    stashUuid: 'candidatestash00000000000000000004',
    skuUuid: 'H',
    details: buildMockOrderSnapshotForCandidate('H'),
    dbCreatedAt: '2026-04-20T11:30:00.000Z',
    dbUpdatedAt: '2026-04-20T11:30:00.000Z',
  },
  ...Array.from({ length: 30 }, (_, i) => {
    const idx = i + 1
    const minute = String((i * 3 + 1) % 60).padStart(2, '0')
    const hour = String(12 + Math.floor((i * 3 + 1) / 60)).padStart(2, '0')
    const createdAt = `2026-04-21T${hour}:${minute}:00.000Z`
    const products = ['B', 'D', 'H', 'J', 'F', 'K', 'L', 'M'] as const
    const pid = products[i % products.length]!
    return {
      uuid: `candidate-item-seed-${String(idx).padStart(2, '0')}`,
      stashUuid: `candidate-stash-seed-${String(idx).padStart(2, '0')}`,
      skuUuid: pid,
      details: buildMockOrderSnapshotForCandidate(pid),
      dbCreatedAt: createdAt,
      dbUpdatedAt: createdAt,
    }
  }),
]
const seededCandidateItems: CandidateItemRecord[] = seededCandidateItemDrafts.map((item) => ({
  ...item,
  isLatestLlmComment: true,
}))
export function ensureCandidateSeed() {
  const stashRaw = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
  const itemRaw = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
  if (stashRaw == null) localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(seededCandidateStashes))
  if (itemRaw == null) {
    localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(seededCandidateItems))
    return
  }
  try {
    const items = JSON.parse(itemRaw) as CandidateItemRecord[]
    let changed = false
    const nextItems = items.map((item) => {
      const nextDetails = ensureMockAiCommentForSnapshot(item.details)
      if (nextDetails === item.details) return item
      changed = true
      return {
        ...item,
        details: nextDetails,
      }
    })
    if (changed) localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(nextItems))
  } catch {
    /* keep existing storage untouched if it cannot be parsed */
  }
}

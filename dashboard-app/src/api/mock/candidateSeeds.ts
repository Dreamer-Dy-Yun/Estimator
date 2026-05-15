import { DEFAULT_CANDIDATE_STASH_CONTEXT, type CandidateItemRecord, type CandidateStashRecord } from './records'
import {
  buildMockOrderSnapshotForCandidate,
  ensureMockAiCommentForSnapshot,
} from './orderSnapshotForCandidate'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { skuGroupKeyByLegacyId } from './salesTables'

const skuGroupKey = (legacyId: string) => skuGroupKeyByLegacyId[legacyId] ?? legacyId

export const seededCandidateStashes: CandidateStashRecord[] = [
  {
    uuid: 'candidatestash00000000000000000001',
    name: '기본 후보군 A',
    note: '초기 목업 데이터',
    userUuid: MOCK_ADMIN_USER_UUID,
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T09:00:00.000Z',
    dbUpdatedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000002',
    name: '봄 시즌 후보군',
    note: '가격 민감도 높은 구성',
    userUuid: MOCK_ADMIN_USER_UUID,
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T10:30:00.000Z',
    dbUpdatedAt: '2026-04-20T10:30:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000003',
    name: '기본 후보군 D',
    note: '의류 카테고리 기본안',
    userUuid: MOCK_ADMIN_USER_UUID,
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T11:00:00.000Z',
    dbUpdatedAt: '2026-04-20T11:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000004',
    name: '기본 후보군 H',
    note: '신발 프리미엄 라인',
    userUuid: MOCK_ADMIN_USER_UUID,
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: '2026-04-20T11:20:00.000Z',
    dbUpdatedAt: '2026-04-20T11:20:00.000Z',
  },
]
const seededCandidateItemDrafts: Array<Omit<CandidateItemRecord, 'isLatestLlmComment' | 'skuUuid'>> = [
  {
    uuid: 'candidateitem000000000000000000001',
    stashUuid: 'candidatestash00000000000000000001',
    skuGroupKey: skuGroupKey('B'),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey('B')),
    dbCreatedAt: '2026-04-20T09:10:00.000Z',
    dbUpdatedAt: '2026-04-20T09:10:00.000Z',
  },
  /** 기본 후보군 A(01) — 이너 11건: 목록·필터·스크롤·정렬·상이한 사이즈 체계 */
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
      ['013', 'TEST_SHOE', '09:28:00.000Z', '09:28:30.000Z'],
      ['014', 'TEST_TOP', '09:29:00.000Z', '09:29:30.000Z'],
    ] as const
  ).map(([suffix, pid, created, updated]) => ({
    uuid: `candidateitem000000000000000000${suffix}`,
    stashUuid: 'candidatestash00000000000000000001',
    skuGroupKey: skuGroupKey(pid),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey(pid)),
    dbCreatedAt: `2026-04-20T${created}`,
    dbUpdatedAt: `2026-04-20T${updated}`,
  })),
  {
    uuid: 'candidateitem000000000000000000002',
    stashUuid: 'candidatestash00000000000000000002',
    skuGroupKey: skuGroupKey('B'),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey('B')),
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
    skuGroupKey: skuGroupKey(pid),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey(pid)),
    dbCreatedAt: `2026-04-20T${created}`,
    dbUpdatedAt: `2026-04-20T${updated}`,
  })),
  {
    uuid: 'candidateitem000000000000000000003',
    stashUuid: 'candidatestash00000000000000000003',
    skuGroupKey: skuGroupKey('D'),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey('D')),
    dbCreatedAt: '2026-04-20T11:10:00.000Z',
    dbUpdatedAt: '2026-04-20T11:10:00.000Z',
  },
  {
    uuid: 'candidateitem000000000000000000004',
    stashUuid: 'candidatestash00000000000000000004',
    skuGroupKey: skuGroupKey('H'),
    details: buildMockOrderSnapshotForCandidate(skuGroupKey('H')),
    dbCreatedAt: '2026-04-20T11:30:00.000Z',
    dbUpdatedAt: '2026-04-20T11:30:00.000Z',
  },
]
export const seededCandidateItems: CandidateItemRecord[] = seededCandidateItemDrafts.map((item) => ({
  ...item,
  skuUuid: item.skuGroupKey,
  details: item.details ? ensureMockAiCommentForSnapshot(item.details) : null,
  isLatestLlmComment: true,
}))

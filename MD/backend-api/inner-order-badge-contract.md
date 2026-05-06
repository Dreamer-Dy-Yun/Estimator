# 이너 오더 배지 API 계약 메모

## Goal

이너 오더 목록은 프론트에서 배지 종류를 하드코딩하지 않고, 백엔드가 내려주는 배지 정의와 아이템별 배지 이름을 조합해 표시한다.

## Scope

- 대상 화면: 오더 후보군 상세 모달의 이너 오더 목록
- 대상 타입: `CandidateItemListResult.badgeDefinitions`, `CandidateItemSummary.insight.badgeNames`

## Contract

`getCandidateItemsByStash(stashUuid)`는 아이템 배열과 배지 정의 맵을 함께 반환한다. 전역 랜딩 시점에 모든 배지 정의를 따로 받는 방식보다, 후보군 목록 응답에 정의를 함께 싣는 방식이 데이터와 정의 버전을 맞추기 쉽다.

```ts
interface CandidateItemListResult {
  items: CandidateItemSummary[]
  badgeDefinitions: Record<string, {
    color: string
    tooltip: string
  }>
}
```

`CandidateItemSummary.insight`에는 목록 표시용 `expectedSalesQty`와 배지 이름 배열이 포함된다.

```ts
interface CandidateItemInsightSummary {
  badgeNames: string[]
}
```

## Principles

- 배지의 의미, 기준값, 색상, 툴팁은 백엔드/API 응답이 결정한다.
- 프론트는 `badgeNames`에 들어온 이름을 `badgeDefinitions`에서 찾아 렌더링한다.
- 알 수 없는 배지 이름은 회색 기본 배지와 이름 툴팁으로 표시해 API 누락을 화면에서 숨기지 않는다.
- 상위 n%, 하위 m%에 따른 행 음영 기준도 백엔드/API 데이터와 맞춘다.

## Result

목데이터 기준 배지는 `크림판매`, `자사이익`, `자사판매` 3종만 사용한다. 각 아이템은 이 배지 이름만 가지고, 색상과 툴팁은 응답의 `badgeDefinitions`에서 가져온다.

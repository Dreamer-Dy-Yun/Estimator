# 이너 오더 배지 API 계약 메모

## Goal

이너 오더 목록은 프론트에서 배지 종류를 하드코딩하지 않고, 백엔드가 내려주는 배지 JSON을 그대로 표시한다.

## Scope

- 대상 화면: 오더 후보군 상세 모달의 이너 오더 목록
- 대상 타입: `CandidateItemSummary.insight.badges`

## Contract

`CandidateItemSummary.insight`에는 목록 표시용 `expectedSalesQty`가 포함된다.

`badges` 배열의 각 항목은 아래 형태를 따른다.

```ts
{
  id: string
  name: string
  label: string
  description: string
  value?: string | number | boolean | null
  rankPercentile?: number | null
  thresholdPercent?: number | null
  style: {
    textColor: string
    backgroundColor: string
    borderColor: string
  }
  payload?: Record<string, string | number | boolean | null>
}
```

## Principles

- 배지의 의미, 기준값, 색상은 백엔드가 결정한다.
- 프론트는 받은 배지 객체를 모두 렌더링한다.
- 배지의 `description`과 추가 필드는 hover title에 노출해 백엔드 연결 시 검증이 가능하게 한다.
- 상위 n%, 하위 m%에 따른 행 음영 기준도 백엔드/API 데이터와 맞춘다.

## Result

이너 오더 목록 헤더를 복구하고, 행 컬럼을 `체크박스 / 브랜드 / 상품코드 / 상품명 / 배지 / 총 예상 판매수량 / 총 예상 오더 금액` 순서로 정렬했다.

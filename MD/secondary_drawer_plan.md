# 2차 드로어(확장 패널) 계획

## 목표

`ProductSummaryDrawer` 오른쪽 확장 영역을 `product-secondary/` 전용 컴포넌트로 구현한다. 경쟁사 선택, 판매 비교, 재고·오더, AI 목업, 사이즈별 오더, 확정 시 스냅샷 저장을 포함한다.

## 열린 이슈 — 가정으로 확정한 사항

| 주제 | 가정 |
|------|------|
| 경쟁사 목록 | 목 데이터 2~3개(예: 크림, 네이버 스토어, 무신사). 이후 API로 교체. |
| 영업이익률 필터 | 임계값 T: **자사** 영업이익률이 **≥ T%**일 때만 확정 허용, 아니면 배너 + 확정 비활성. |
| 평균 판매가 관계 | 평균 판매가 = 평균 원가 + 개당 매출이익(원) 문구로 표시, 수치는 목업. |
| 재고 공식 | 목업: 선택 기간 `salesTrend`로 일평균·시그마 산출, 안전재고는 `z(서비스수준) × 시그마 × √리드타임` 등 단순 z표. |
| LLM | 지연 + 고정 형식 답변, 실제 엔드포인트는 추후. |
| 오더 확정 | 전체 JSON 스냅샷을 `dashboard.orderSnapshots.v1`에 상품 ID별 배열로 추가. |
| 기간 | 1차 드로어와 동일: `periodStart`, `periodEnd` props. |

## 파일 구성

```
dashboard-app/src/dashboard/components/product-secondary/
  ko.ts
  secondaryPanelTypes.ts
  mockSecondaryData.ts
  productSecondaryPanel.module.css
  ProductSecondaryPanel.tsx
```

## UI 블록 (위에서 아래)

1. **메타 + 필터** — 브랜드, 카테고리, 품번, 상품명; 경쟁사 `<select>`; 영업이익률 하한 % (기본 0).
2. **판매 정보** — 열 = 자사 | 선택 경쟁사; 판매량·판매액 순위; 원가 비율·수수료율; 영업이익.
3. **재고·오더** — 기간 평균 일판매량, 시그마; 입력 서비스 수준 %, 리드타임(일); 안전재고, 추천 합계 수량; 기대 오더액·판매금액·영업이익.
4. **AI** — 질의 textarea, 답변 생성 버튼, 답변 영역(목업).
5. **사이즈** — 사이즈별 자사·경쟁사 비중; 자사 가중치 슬라이더; 가중 비중; 사이즈별 추천 수량·편집 가능 확정 수량 + 「추천 수량 적용」; **오더 확정** 시 스냅샷(패널 전체 + LLM).

## 구현 순서

1. 타입 + 목 데이터 + `ko.ts`(문구)
2. CSS 모듈
3. `ProductSecondaryPanel`
4. `ProductSummaryDrawer` 확장 패널에 연결
5. build + lint

# 스냅샷 확정 페이지 구현 계획

- 작성일: 2026-04-20
- 변경일: 2026-04-20
- 지시자: Yun Daeyoung

## 목표

- 대시보드에 `스냅샷 확정` 탭/페이지를 추가한다.
- 스냅샷 목록은 기본적으로 상품 코드당 1개 카드(최신 스냅샷)만 노출한다.
- 상품 코드를 클릭하면 해당 상품 코드의 스냅샷 이력(저장일시, 노트)을 펼쳐 보여준다.
- 이력 항목 클릭 시 1/2차 내용을 확인할 수 있는 상세 드로워를 연다.
- 2차 드로워에서 스냅샷 저장 시 노트를 입력할 수 있게 한다.

## 구현 범위

1. 스냅샷 데이터 모델 확장
   - `OrderSnapshotDocumentV1`에 `note` 필드 추가
2. API 확장(목 포함)
   - 스냅샷 저장 API는 note 포함 payload 저장
   - 스냅샷 조회 API 추가
3. 2차 드로워 저장 UI 확장
   - `내용담기(스냅샷 저장)` 전 노트 입력
4. 신규 페이지 추가
   - 라우트/탭에 `스냅샷 확정` 추가
   - 상품 코드 그룹 카드 + 이력 리스트 + 상세 드로워

## 영향 파일(예상)

- `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- `dashboard-app/src/api/types/secondary.ts`
- `dashboard-app/src/api/types/dashboard-api.ts`
- `dashboard-app/src/api/types/index.ts`
- `dashboard-app/src/api/index.ts`
- `dashboard-app/src/api/client.ts`
- `dashboard-app/src/api/mock.ts`
- `dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/cards/SizeOrderCard.tsx`
- `dashboard-app/src/dashboard/components/product-secondary/ko.ts`
- `dashboard-app/src/dashboard/pages/SnapshotConfirmPage.tsx` (신규)
- `dashboard-app/src/App.tsx`
- `dashboard-app/src/dashboard/DashboardLayout.tsx`

## 검증 계획

- 타입 검사: `npx tsc --noEmit`
- 목록/상세 플로우 수동 확인
  - 노트 입력 후 저장
  - 스냅샷 확정 탭에서 상품코드 그룹 확인
  - 이력 클릭 시 상세 드로워 확인

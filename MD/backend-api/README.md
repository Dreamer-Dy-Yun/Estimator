# 백엔드 API 문서 (대시보드)

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-07 |
| 상태 | 유지 문서 |
| 적용 범위 | 백엔드 API 문서 |

## 목적

프론트엔드의 `DashboardApi` 계약(`dashboard-app/src/api/types/dashboard-api.ts`)을 HTTP 백엔드로 구현할 때 참고하는 문서입니다. 구현 시 **프론트 타입 정의와 응답 JSON 필드명이 1:1로 일치**해야 합니다.

문서 작성·보존 기준은 [../README.md](../README.md)를 따릅니다.

## 문서 구성

| 파일 | 설명 |
|------|------|
| [backend-api-spec.md](./backend-api-spec.md) | REST 제안, 엔드포인트별 요청/응답, 모든 DTO·스냅샷 필드 의미 상세 |

## 단일 소스 (코드)

구현 전에 다음 경로를 열어 최신 타입과 주석을 확인하십시오.

- 계약 인터페이스: [`dashboard-app/src/api/types/dashboard-api.ts`](../../dashboard-app/src/api/types/dashboard-api.ts)
- 2차·후보군·스톡 계산: [`dashboard-app/src/api/types/secondary.ts`](../../dashboard-app/src/api/types/secondary.ts)
- 자사/경쟁 판매 파라미터: [`dashboard-app/src/api/types/sales.ts`](../../dashboard-app/src/api/types/sales.ts)
- 1차 드로어 번들: [`dashboard-app/src/api/types/drawer.ts`](../../dashboard-app/src/api/types/drawer.ts)
- 공통 행 타입: [`dashboard-app/src/types.ts`](../../dashboard-app/src/types.ts)
- 오더 스냅샷 문서: [`dashboard-app/src/snapshot/orderSnapshotTypes.ts`](../../dashboard-app/src/snapshot/orderSnapshotTypes.ts)
- 2차 예측 입력 타입: [`dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawerTypes.ts`](../../dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawerTypes.ts)
- 2차 KPI 타입·계산 공통 유틸: [`dashboard-app/src/utils/salesKpiColumn.ts`](../../dashboard-app/src/utils/salesKpiColumn.ts)

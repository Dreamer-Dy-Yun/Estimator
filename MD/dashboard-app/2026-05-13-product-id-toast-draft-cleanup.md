# 상품 식별자, 드로워 draft, 완료 toast 정리

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-13 |
| 상태 | 완료 |

## Goal

분석 리스트에서 후보군 담기까지 이어지는 상품 식별자 흐름을 DB 설계 용어와 맞추고, 이너후보군 2차 드로워의 live/snapshot 발주 수량 기준을 분리한다. 백엔드 mutation 요청이 성공한 경우 사용자가 흐름을 끊지 않고 완료 여부를 알 수 있게 상단 자동 닫힘 toast를 제공한다.

## Scope

- 자사/경쟁사 분석 행의 UI `id`와 API용 `productId` 분리.
- 후보군 생성 payload에서 단일 `productId` 제거.
- 후보 아이템 record의 상품 식별 필드를 `productId`로 정리.
- 2차 드로워 사이즈별 확정 수량 baseline을 `SecondaryOrderDraft` 클래스로 분리.
- 후보군/관리자/드로워 저장 계열 성공 toast 추가.

## Principles

- 후보군은 상품 하나의 소유자가 아니라 여러 후보 아이템을 담는 컨테이너다.
- `productId`는 `SKU.code + SKU.color_code` 상품 단위이고, 사이즈는 스냅샷/사이즈 행에서 다룬다.
- 스냅샷 기준 보기에서만 저장 당시 확정 수량을 baseline으로 사용하고, live 모드에서는 현재 계산값을 baseline으로 둔다.
- 완료 알림은 모달 alert가 아니라 화면 상단 toast로 자동 닫히게 한다.

## Result

- `SelfSalesRow`/`CompetitorSalesRow`에 `productId`를 추가하고 후보군 담기/드로워 조회는 이 값을 사용한다.
- `CreateCandidateStashPayload`는 `{ name, note?, periodStart, periodEnd, forecastMonths }`로 축소했다.
- `SecondaryOrderDraft`가 live/snapshot 모드별 확정 수량 baseline과 manual override를 계산한다.
- `AppToastProvider`를 앱 루트에 추가하고 후보군 담기, 후보군 메타 변경/삭제/복제, 이너 후보 삭제/엑셀 생성, 2차 스냅샷 저장/수정, 관리자 사용자/GPT 키 변경 성공에 연결했다.
- API 스펙과 소스 경계 지도를 갱신했다.

## Non-goals

- 실제 DB 생성이나 백엔드 endpoint 구현은 하지 않았다.
- 후보군 mutation mock은 여전히 저장소를 변경하지 않고 응답 흐름만 모사한다.

# 프로젝트 문서 관리 기준

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-07 |
| 최종 수정일 | 2026-05-07 |
| 상태 | 유지 문서 |

## 목적

이 폴더는 프로젝트를 다시 파악할 때 필요한 현재 기준 문서만 남기고, 특정 작업의 일회성 이력 문서는 정리한다. 문서는 코드와 API 계약을 설명하는 보조 자료이므로, 기능 변경·계약 변경·폴더 경계 변경이 생기면 코드 변경과 같은 커밋에서 함께 갱신한다.

## 작성 기준

모든 새 MD 문서는 제목 아래에 다음 메타데이터 표를 둔다.

| 항목 | 필수 여부 | 작성 방법 |
|------|-----------|-----------|
| 작성 지시 | 필수 | 문서 작성을 지시한 사람 또는 출처. 예: `Yun Daeyoung` |
| 작성자 | 필수 | 실제 문서를 작성한 사람 또는 에이전트. 예: `Codex` |
| 작성일 | 필수 | 최초 작성일, `YYYY-MM-DD` |
| 최종 수정일 | 필수 | 마지막 의미 변경일, `YYYY-MM-DD` |
| 상태 | 필수 | `유지 문서`, `초안`, `반영 완료`, `폐기 예정` 중 하나 |
| 적용 범위 | 권장 | 관련 앱, 폴더, API, 화면 |

작성자나 작성 지시자를 확인할 수 없는 기존 문서는 임의로 꾸미지 않는다. 대신 `작성자 | 기존 문서(작성자 미확인), 최종 정리: Codex YYYY-MM-DD`처럼 확인 가능한 사실과 정리자를 함께 적는다.

## 보존 기준

유지 문서로 남기는 대상은 다음과 같다.

- 현재 제품 요구사항과 화면 목적을 설명하는 요구사항 문서
- 프론트엔드 구조, 소스 경계, 테스트 전략처럼 앞으로도 갱신할 기준 문서
- 백엔드 API 계약처럼 코드와 DB 구현의 기준이 되는 문서
- 새 기능 개발 전에 아직 코드로 흡수되지 않은 설계 문서

삭제 대상은 다음과 같다.

- 특정 날짜의 작업 결과만 남긴 이력 문서
- 같은 내용이 `frontend-overview.md`, `source-boundary-map.md`, `backend-api-spec.md` 같은 유지 문서에 이미 흡수된 문서
- 목업 전환 과정의 임시 판단 기록처럼 현재 계약을 오히려 흐리게 하는 문서

## 기본 문서

| 문서 | 역할 |
|------|------|
| [dashboard-app/README.md](./dashboard-app/README.md) | 프론트엔드 문서 입구 |
| [dashboard-app/frontend-overview.md](./dashboard-app/frontend-overview.md) | 화면·기능·데이터 흐름 개요 |
| [dashboard-app/source-boundary-map.md](./dashboard-app/source-boundary-map.md) | 소스 폴더와 파일 역할, 경계 규칙 |
| [dashboard-app/test-strategy.md](./dashboard-app/test-strategy.md) | 테스트 전략 |
| [backend-api/README.md](./backend-api/README.md) | 백엔드 API 문서 입구 |
| [backend-api/backend-api-spec.md](./backend-api/backend-api-spec.md) | 백엔드 API 계약 상세 |

## 요구사항 문서

| 문서 | 역할 |
|------|------|
| [self_sales_page_requirements.md](./self_sales_page_requirements.md) | 자사 판매 분석 화면 요구사항 |
| [competitor_sales_page_requirements.md](./competitor_sales_page_requirements.md) | 경쟁사 판매 분석 화면 요구사항 |
| [product_detail_analysis_requirements.md](./product_detail_analysis_requirements.md) | 상품 상세 분석 모달 요구사항 |

# dashboard-app mock 데이터 경계 분리 계획

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

---

## 목적

- `src/api/mock.ts`의 공통 요소(스토리지 키, 유틸, 로컬 레코드 타입)를 경계별 파일로 분리한다.
- 외부 호출 경로(`client.ts` -> `mockDashboardApi`)는 유지해 동작 리스크를 최소화한다.

## 경계 정의

1. **infra 경계**
   - `localStorage` 키 상수
2. **shared util 경계**
   - 지연, 로깅, clamp/hash/uuid 생성 유틸
3. **candidate record 경계**
   - mock 내부 전용 레코드 타입(`CandidateStashRecord`, `CandidateItemRecord`)
4. **api façade 경계**
   - 실제 API 동작(`mockDashboardApi`)은 기존 `mock.ts`에 남겨 점진 분리

## 파일 구조(1차)

- `src/api/mock/constants.ts`
- `src/api/mock/utils.ts`
- `src/api/mock/records.ts`
- `src/api/mock.ts` (기존 공개 엔트리, 내부 import 경계만 분리)

## 작업 순서

1. 경계별 신규 파일 생성
2. `mock.ts` 상단 정의를 신규 파일 import로 교체
3. 타입/빌드 오류 점검 및 테스트 실행

## 검증 기준

- `npm run test:run` 통과
- `npm run build` 통과
- `client.ts` 포함 호출부 변경 없음

# role-reference-map.md

## 역할별 참조 문서

### Orchestrator

- `common-rules.md`
- `role-reference-map.md`
- `orchestrator.md`

### Sub-Agent

- `common-rules.md`
- `role-reference-map.md`
- `sub-agent.md`

### QA

- `common-rules.md`
- `role-reference-map.md`
- `qa.md`

## 역할별 문서 수정/생성 범위

### Orchestrator

- 읽기 전용: `common-rules.md`, `role-reference-map.md`
- 수정 가능: `orchestrator.md`, `todo/`, `plan/`, `review/` 상태 판정용 문서
- 생성 가능: `mulAg/md/todo/*.md`

### Sub-Agent

- 읽기 전용: `common-rules.md`, `role-reference-map.md`, `orchestrator.md`, `todo/*.md`
- 생성 가능: `mulAg/md/review/*.md`
- 수정 가능: Sub-Agent가 할당받은 todo의 대상 파일 범위에서만

### QA

- 읽기 전용: `common-rules.md`, `role-reference-map.md`, `orchestrator.md`, `sub-agent.md`, 모든 `mulAg/md/*/*.md`
- 생성 가능: `mulAg/md/done/*.md`

## 버전 관리 규칙

- 역할별 참조 목록이 변경되면 `role-reference-map.md`를 즉시 수정한다.
- 동일 파일 충돌이 생길 경우 `role-reference-map.md`와 `orchestrator.md`를 기준으로 즉시 정렬 후 다음 단계 진행한다.

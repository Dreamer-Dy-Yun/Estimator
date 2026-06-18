# 2차 드로워 확정 토글과 임시 draft

## TODO

- 없음.

## DONE

- 스냅샷 기준 보기 토글과 전용 snapshot view helper를 제거했다.
- 이너 후보 액션 카드를 초기화/확정 토글/삭제 grid로 재배치했다.
- 후보군 상세 모달 생명주기 안에서 itemUuid별 클라이언트 메모리 draft를 유지하도록 했다.
- 확정은 현재 2차 드로워 상태를 snapshot으로 저장하고, 확정 해제는 확인 모달 후 `confirmedOrderSnapshot: null`로 저장하도록 했다.
- 초기화는 DB snapshot을 바꾸지 않고 현재 이너오더 조회 기간 live 계산 상태로 복귀하도록 했다.
- 관련 프론트/백엔드 계약 문서를 갱신했다.

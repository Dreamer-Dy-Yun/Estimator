# PowerShell UTF-8 모지바케 처리 기준

| 항목 | 내용 |
|------|------|
| 작성자 | Yun Daeyoung |
| 정리 | Codex |
| 최초 작성일 | 2026-05-14 |
| 최근 갱신일 | 2026-05-22 |
| 상태 | 운영 기준 |
| 관련 범위 | PowerShell, Windows 콘솔, UTF-8 입출력, Codex 작업 |

## 목적

이 문서는 Windows PowerShell 환경에서 한글이 깨져 보이거나 깨진 문자열이 파일에 저장되는 문제를 막기 위한 기준이다. 파일이 실제로 UTF-8이어도 터미널 표시 단계에서 깨질 수 있으며, 깨져 보이는 출력 내용을 다시 저장하면 유효한 UTF-8 모지바케가 코드에 들어갈 수 있다.

## 원인

- 저장 파일은 UTF-8인데 PowerShell 콘솔 코드페이지가 UTF-8이 아닐 수 있다.
- Windows PowerShell 5.1은 UTF-8 표시와 파이프라인 처리에서 혼동이 발생하기 쉽다.
- 터미널 출력은 bytes가 아니라 이미 렌더링된 문자열이므로, 표시가 깨졌다고 파일이 반드시 깨진 것은 아니다.
- 깨져 보이는 `Get-Content` 출력이나 도구 로그를 그대로 복사해 `Set-Content`로 저장하면 모지바케가 실제 파일 내용이 된다.
- `U+FFFD` replacement character가 없어도 `異붿`, `泥섎`, `?꾨`, `?? ??` 같은 유효 유니코드 모지바케가 남을 수 있다. <!-- intentional-mojibake-example -->

## 구분 기준

| 구분 | 판단 방법 | 처리 |
|------|-----------|------|
| 표시 문제 | Node `fs.readFileSync(path, "utf8")`로 읽은 내용은 정상인데 PowerShell 출력만 깨진다. | 파일은 수정하지 않는다. PowerShell 표시 설정만 조정한다. |
| 저장 오염 | Node로 읽어도 `U+FFFD`, CJK 조합, `?+한글`, 반복 `??` 문구가 남아 있다. | 해당 파일을 UTF-8 기준으로 복구한다. |
| 의도 예외 | 테스트 fixture에서 깨진 문자열을 일부러 다룬다. | `intentional-mojibake-example` 주석을 붙인다. |

## 확인 명령

PowerShell 출력이 의심될 때는 Node로 UTF-8 파일 내용을 확인한다.

```powershell
node -e "const fs=require('fs'); console.log(fs.readFileSync('<path>','utf8'))"
```

replacement character 개수를 확인한다.

```powershell
node -e "const fs=require('fs'); const s=fs.readFileSync('<path>','utf8'); console.log([...s].filter(ch=>ch.charCodeAt(0)===0xfffd).length)"
```

저장 오염 후보를 확인한다.

```powershell
npm run check:encoding
```

## 작업 원칙

- 한글 문자열은 UTF-8로 저장한다.
- PowerShell에 깨져 보이는 한글 출력은 그대로 복사해 저장하지 않는다.
- 한글 UI 문구를 수정할 때는 기존 `KO` 상수나 Node UTF-8 출력 기준으로 확인한다.
- 의미가 불명확한 깨진 문구는 추정 복구하지 말고 TODO 또는 review에 남긴다.
- `git show HEAD:<path>`로 이전 정상 문구를 확인할 수 있어도 destructive checkout은 사용하지 않는다.

## PowerShell 표시 설정

필요 시 세션 시작 후 다음 설정을 적용한다.

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

이 설정은 표시 안정성을 높이지만, 파일 저장의 정합성을 보장하지 않는다. 파일 저장 여부는 Node UTF-8 읽기와 `npm run check:encoding`으로 확인한다.

## 금지 사항

- PowerShell에 깨져 보이는 출력을 근거로 한글 문자열을 재작성하지 않는다.
- `Get-Content` 결과가 깨져 보인다는 이유만으로 `Set-Content`를 실행하지 않는다.
- `??`로 깨진 문서 문구를 의미 확인 없이 임의 추정하지 않는다.
- 검증 없이 깨진 문자열 복구 완료를 보고하지 않는다.

import { useRef, useState, type DragEvent } from 'react'
import styles from './AdminPage.module.css'

export interface LoadedGoogleSheetKey {
  fileName: string
  keyJson: string
  serviceAccountEmail: string
}

export interface AdminGoogleSheetKeyDropzoneProps {
  fileName: string
  serviceAccountEmail: string
  disabled?: boolean
  onLoaded: (loaded: LoadedGoogleSheetKey) => void
  onClear: () => void
  onError: (message: string) => void
}

function extractServiceAccountEmail(keyJson: string) : string {
  try {
    const parsed: { client_email?: unknown; } = JSON.parse(keyJson) as { client_email?: unknown }
    if (typeof parsed.client_email === 'string' && parsed.client_email.trim()) {
      return parsed.client_email.trim()
    }
  } catch {
    throw new Error('서비스 계정 JSON 파일 형식이 올바르지 않습니다.')
  }
  throw new Error('서비스 계정 JSON 파일의 client_email을 찾을 수 없습니다.')
}

export function AdminGoogleSheetKeyDropzone({
  fileName,
  serviceAccountEmail,
  disabled = false,
  onLoaded,
  onClear,
  onError,
}: AdminGoogleSheetKeyDropzoneProps) : React.JSX.Element {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)

  const loadFile: (file: File | null | undefined) => Promise<void> = async (file: File | null | undefined) : Promise<void> => {
    if (!file || disabled) return
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      onError('서비스 계정 JSON 파일만 업로드할 수 있습니다.')
      return
    }
    try {
      const keyJson: string = await file.text()
      onLoaded({
        fileName: file.name,
        keyJson,
        serviceAccountEmail: extractServiceAccountEmail(keyJson),
      })
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : '서비스 계정 JSON 파일을 읽지 못했습니다.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
      setIsDragging(false)
    }
  }

  const handleDrop: (event: DragEvent<HTMLDivElement>) => void = (event: DragEvent<HTMLDivElement>) : void => {
    event.preventDefault()
    void loadFile(event.dataTransfer.files[0])
  }

  const handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void = (event: React.ChangeEvent<HTMLInputElement>) : void => {
    void loadFile(event.target.files?.[0])
  }

  return (
    <div className={`${styles.createField} ${styles.googleSheetKeyField}`}>
      <span>서비스 계정 JSON 키</span>
      <div
        className={`${styles.googleSheetKeyDropzone} ${isDragging ? styles.googleSheetKeyDropzoneActive : ''}`}
        role="button"
        tabIndex={0}
        onClick={() : void | undefined => inputRef.current?.click()}
        onDragEnter={(event: DragEvent<HTMLDivElement>) : void => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>) : void => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event: DragEvent<HTMLDivElement>) : void => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={handleDrop}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) : void => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label="서비스 계정 JSON 키 파일 업로드"
      >
        <input
          ref={inputRef}
          className={styles.googleSheetKeyHiddenInput}
          type="file"
          accept=".json,application/json"
          disabled={disabled}
          onChange={handleFileChange}
        />
        <strong>{fileName || 'JSON 파일을 드래그앤드랍'}</strong>
        <small>
          {serviceAccountEmail || '클릭해서 선택할 수도 있습니다. client_email은 파일에서 자동으로 읽습니다.'}
        </small>
        {fileName ? (
          <button
            className={styles.googleSheetKeyClearButton}
            type="button"
            disabled={disabled}
            onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) : void => {
              event.stopPropagation()
              onClear()
            }}
          >
            파일 제거
          </button>
        ) : null}
      </div>
    </div>
  )
}

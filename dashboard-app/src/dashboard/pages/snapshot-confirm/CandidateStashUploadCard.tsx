import type { RefObject } from 'react'
import type { CandidateStashExcelUploadResult } from '../../../api'
import styles from '../../components/common.module.css'
import pageStyles from '../SnapshotConfirmPage.module.css'

type Props = {
  templateDownload: {
    href: string
    filename: string
  }
  uploadInputRef: RefObject<HTMLInputElement | null>
  uploadFile: File | null
  uploadBusy: boolean
  uploadDragActive: boolean
  uploadError: string | null
  uploadResult: CandidateStashExcelUploadResult | null
  onSelectFile: (file: File | null) => void
  onUpload: () => void
  onDragActiveChange: (active: boolean) => void
}

export function CandidateStashUploadCard({
  templateDownload,
  uploadInputRef,
  uploadFile,
  uploadBusy,
  uploadDragActive,
  uploadError,
  uploadResult,
  onSelectFile,
  onUpload,
  onDragActiveChange,
}: Props) {
  return (
    <div className={`${styles.card} ${pageStyles.uploadCard}`}>
      <div className={pageStyles.uploadCopy}>
        <div className={pageStyles.uploadTitleRow}>
          <strong className={pageStyles.uploadTitle}>엑셀 업로드</strong>
          <span className={pageStyles.uploadBadge}>후보군 추가</span>
          <p className={pageStyles.uploadDescription}>
            엑셀 파일을 끌어오거나 클릭해서 오더 후보군을 추가합니다.
          </p>
        </div>
        <div className={pageStyles.uploadTemplateCell}>
          <a
            className={pageStyles.templateButton}
            href={templateDownload.href}
            download={templateDownload.filename}
          >
            템플릿 다운로드
          </a>
        </div>
      </div>
      <div className={pageStyles.uploadControls}>
        <input
          id="candidate-stash-excel-upload"
          ref={uploadInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className={pageStyles.uploadInput}
          disabled={uploadBusy}
          onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={`${pageStyles.uploadDropzone} ${uploadDragActive ? pageStyles.uploadDropzoneActive : ''}`}
          disabled={uploadBusy}
          onClick={() => uploadInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!uploadBusy) onDragActiveChange(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!uploadBusy) onDragActiveChange(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDragActiveChange(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onDragActiveChange(false)
            if (uploadBusy) return
            onSelectFile(event.dataTransfer.files?.[0] ?? null)
            if (uploadInputRef.current) uploadInputRef.current.value = ''
          }}
        >
          <span className={pageStyles.uploadDropzoneTitle}>
            {uploadFile ? uploadFile.name : '엑셀 파일을 끌어오거나 클릭'}
          </span>
          <span className={pageStyles.uploadDropzoneSub}>.xlsx, .xls 파일만 업로드</span>
        </button>
        <button
          type="button"
          className={`${pageStyles.actionBtn} ${pageStyles.btnPrimary}`}
          disabled={!uploadFile || uploadBusy}
          onClick={onUpload}
        >
          {uploadBusy ? '업로드 중...' : '업로드'}
        </button>
      </div>
      {(uploadError || uploadResult) && (
        <div className={uploadError ? pageStyles.uploadError : pageStyles.uploadResult}>
          {uploadError
            ? uploadError
            : `${uploadResult?.stashName ?? '후보군'} 생성 완료 · 등록 상품 ${uploadResult?.itemCount ?? 0}건`}
        </div>
      )}
    </div>
  )
}

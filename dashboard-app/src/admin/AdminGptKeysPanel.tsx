import { useEffect, useState, type FormEvent } from 'react'
import {
  createAdminGptKey,
  deleteAdminGptKey,
  getAdminGptKeys,
  rotateAdminGptKey,
  testAdminGptKey,
  updateAdminGptKey,
} from '../api'
import { useAppToast } from '../components/AppToastContext'
import type {
  AdminGptKeyPurpose,
  AdminGptKeySummary,
  AdminGptKeyTestResult,
} from '../api'
import {
  GPT_KEY_PURPOSE_OPTIONS,
  gptKeyTestStatusLabels,
  getErrorMessage,
} from './adminHelpers'
import styles from './AdminPage.module.css'

function AdminGptKeyRow({
  gptKey,
  onOpen,
}: {
  gptKey: AdminGptKeySummary
  onOpen: (gptKey: AdminGptKeySummary) => void
}) {
  return (
    <button className={styles.gptKeyListRow} type="button" onClick={() => onOpen(gptKey)}>
      <span className={styles.gptKeyNameCell}>
        <strong>{gptKey.name}</strong>
        <small>{gptKey.uuid}</small>
      </span>
      <span>{GPT_KEY_PURPOSE_OPTIONS.find((option) => option.value === gptKey.purpose)?.label ?? gptKey.purpose}</span>
      <span>{gptKey.model}</span>
      <span>{gptKey.maskedKey}</span>
      <span className={styles.gptKeyStatusSummary}>
        <span className={`${styles.statusPill} ${gptKey.isActive ? styles.status_success : styles.status_failed}`}>
          {gptKey.isActive ? '활성' : '비활성'}
        </span>
        <small>{gptKeyTestStatusLabels[gptKey.lastTestStatus]}</small>
      </span>
    </button>
  )
}

function AdminGptKeyDialog({
  gptKey,
  onClose,
  onChanged,
  onDeleted,
  onTested,
}: {
  gptKey: AdminGptKeySummary
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
  onTested: (result: AdminGptKeyTestResult) => void
}) {
  const { showToast } = useAppToast()
  const [name, setName] = useState(gptKey.name)
  const [purpose, setPurpose] = useState<AdminGptKeyPurpose>(gptKey.purpose)
  const [model, setModel] = useState(gptKey.model)
  const [note, setNote] = useState(gptKey.note ?? '')
  const [isActive, setIsActive] = useState(gptKey.isActive)
  const [rotateKey, setRotateKey] = useState('')
  const [rowMessage, setRowMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const isDirty =
    name !== gptKey.name ||
    purpose !== gptKey.purpose ||
    model !== gptKey.model ||
    note !== (gptKey.note ?? '') ||
    isActive !== gptKey.isActive

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)

    try {
      await updateAdminGptKey({
        uuid: gptKey.uuid,
        name,
        purpose,
        model,
        isActive,
        note,
      })
      await onChanged()
      setRowMessage('변경됨')
      showToast('GPT 키 정보를 변경했습니다.')
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRotate = async () => {
    setErrorMessage(null)
    setRowMessage(null)
    setIsRotating(true)

    try {
      await rotateAdminGptKey({ uuid: gptKey.uuid, plainKey: rotateKey })
      setRotateKey('')
      await onChanged()
      setRowMessage('키 교체됨')
      showToast('GPT API 키를 교체했습니다.')
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsRotating(false)
    }
  }

  const handleTest = async () => {
    setErrorMessage(null)
    setRowMessage(null)
    setIsTesting(true)

    try {
      const result = await testAdminGptKey(gptKey.uuid)
      onTested(result)
      setRowMessage(result.message)
      showToast(result.message, { variant: result.status === 'success' ? 'success' : 'error' })
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async () => {
    setErrorMessage(null)
    setRowMessage(null)

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setRowMessage('삭제 버튼을 한 번 더 누르면 GPT 키가 삭제됩니다.')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAdminGptKey(gptKey.uuid)
      await onDeleted()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-gpt-key-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>GPT 키 관리</span>
            <h3 id="admin-gpt-key-dialog-title">상세 설정</h3>
          </div>
          <button className={styles.gptKeyDialogCloseButton} type="button" onClick={onClose} aria-label="닫기">
            x
          </button>
        </header>

        <form className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <label className={styles.createField}>
            <span>이름</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </label>
          <label className={styles.createField}>
            <span>용도</span>
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as AdminGptKeyPurpose)}>
              {GPT_KEY_PURPOSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.createField}>
            <span>모델</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} maxLength={80} />
          </label>
          <label className={styles.createActiveField}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span>활성</span>
          </label>
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>메모</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
          </label>
          <button className={styles.createButton} type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? '변경 중' : '변경'}
          </button>
        </form>

        <div className={styles.gptKeyDialogRotate}>
          <label className={styles.createField}>
            <span>새 GPT API 키</span>
            <input
              value={rotateKey}
              onChange={(event) => setRotateKey(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
          <button className={styles.secondaryButton} type="button" onClick={handleRotate} disabled={isRotating}>
            {isRotating ? '교체 중' : '키 교체'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={handleTest} disabled={isTesting}>
            {isTesting ? '테스트 중' : '연결 테스트'}
          </button>
        </div>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? '삭제 중' : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}

export function AdminGptKeysPanel() {
  const { showToast } = useAppToast()
  const [gptKeys, setGptKeys] = useState<AdminGptKeySummary[]>([])
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState<AdminGptKeyPurpose>('ai-comment')
  const [newModel, setNewModel] = useState('gpt-4.1-mini')
  const [newPlainKey, setNewPlainKey] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newIsActive, setNewIsActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedGptKeyUuid, setSelectedGptKeyUuid] = useState<string | null>(null)
  const selectedGptKey = gptKeys.find((gptKey) => gptKey.uuid === selectedGptKeyUuid) ?? null

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    getAdminGptKeys()
      .then((nextGptKeys) => {
        if (alive) setGptKeys(nextGptKeys)
      })
      .catch((error) => {
        if (alive) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const reloadGptKeys = async () => {
    const nextGptKeys = await getAdminGptKeys()
    setGptKeys(nextGptKeys)
    return nextGptKeys
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setTestMessage(null)
    setIsCreating(true)

    try {
      await createAdminGptKey({
        name: newName,
        purpose: newPurpose,
        model: newModel,
        plainKey: newPlainKey,
        isActive: newIsActive,
        note: newNote,
      })
      await reloadGptKeys()
      setNewName('')
      setNewPlainKey('')
      setNewNote('')
      setNewIsActive(true)
      showToast('GPT 키를 추가했습니다.')
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleTested = (result: AdminGptKeyTestResult) => {
    setGptKeys((currentGptKeys) =>
      currentGptKeys.map((gptKey) =>
        gptKey.uuid === result.uuid
          ? {
              ...gptKey,
              lastTestStatus: result.status,
              lastTestedAt: result.testedAt,
              dbUpdatedAt: result.testedAt,
            }
          : gptKey,
      ),
    )
    setTestMessage(result.message)
  }

  const handleDeleted = async () => {
    await reloadGptKeys()
    setSelectedGptKeyUuid(null)
    setTestMessage('GPT 키가 삭제되었습니다.')
    showToast('GPT 키를 삭제했습니다.')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>GPT 키</h2>
          <p>{gptKeys.length}개</p>
        </div>
        {testMessage ? <span className={styles.panelNotice}>{testMessage}</span> : null}
      </div>

      <form className={styles.gptKeyCreateForm} onSubmit={handleCreate}>
        <label className={styles.createField}>
          <span>이름</span>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="GPT AI 코멘트"
            maxLength={80}
          />
        </label>
        <label className={styles.createField}>
          <span>용도</span>
          <select value={newPurpose} onChange={(event) => setNewPurpose(event.target.value as AdminGptKeyPurpose)}>
            {GPT_KEY_PURPOSE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.createField}>
          <span>모델</span>
          <input value={newModel} onChange={(event) => setNewModel(event.target.value)} maxLength={80} />
        </label>
        <label className={styles.createField}>
          <span>GPT API 키</span>
          <input
            value={newPlainKey}
            onChange={(event) => setNewPlainKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>
        <label className={styles.createActiveField}>
          <input
            type="checkbox"
            checked={newIsActive}
            onChange={(event) => setNewIsActive(event.target.checked)}
          />
          <span>활성</span>
        </label>
        <label className={`${styles.createField} ${styles.gptKeyCreateNote}`}>
          <span>메모</span>
          <input
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            placeholder="용도나 발급 위치"
            maxLength={200}
          />
        </label>
        <button className={styles.createButton} type="submit" disabled={isCreating}>
          {isCreating ? '추가 중' : 'GPT 키 추가'}
        </button>
        {createErrorMessage ? <p className={styles.createError}>{createErrorMessage}</p> : null}
      </form>

      <div className={styles.gptKeyTableHeader} aria-hidden="true">
        <span>이름</span>
        <span>용도</span>
        <span>모델</span>
        <span>키</span>
        <span>상태</span>
      </div>

      {isLoading ? <div className={styles.emptyState}>GPT 키 목록 로딩 중</div> : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? (
        <div className={styles.userList}>
          {gptKeys.map((gptKey) => (
            <AdminGptKeyRow
              key={gptKey.uuid}
              gptKey={gptKey}
              onOpen={(nextGptKey) => setSelectedGptKeyUuid(nextGptKey.uuid)}
            />
          ))}
        </div>
      ) : null}

      {selectedGptKey ? (
        <AdminGptKeyDialog
          key={selectedGptKey.uuid}
          gptKey={selectedGptKey}
          onClose={() => setSelectedGptKeyUuid(null)}
          onChanged={reloadGptKeys}
          onDeleted={handleDeleted}
          onTested={handleTested}
        />
      ) : null}
    </div>
  )
}

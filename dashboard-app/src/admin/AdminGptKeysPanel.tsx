import { useEffect, useState, type FormEvent } from 'react'
import {
  createAdminGptKey,
  getAdminGptKeys,
  rotateAdminGptKey,
  testAdminGptKey,
  updateAdminGptKey,
} from '../api'
import type {
  AdminGptKeyPurpose,
  AdminGptKeySummary,
  AdminGptKeyTestResult,
} from '../api'
import {
  GPT_KEY_PURPOSE_OPTIONS,
  gptKeyTestStatusLabels,
  formatUpdatedAt,
  getErrorMessage,
} from './adminHelpers'
import styles from './AdminPage.module.css'

function AdminGptKeyRow({
  gptKey,
  onChanged,
  onTested,
}: {
  gptKey: AdminGptKeySummary
  onChanged: () => Promise<void>
  onTested: (result: AdminGptKeyTestResult) => void
}) {
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
  const isDirty =
    name !== gptKey.name ||
    purpose !== gptKey.purpose ||
    model !== gptKey.model ||
    note !== (gptKey.note ?? '') ||
    isActive !== gptKey.isActive

  useEffect(() => {
    setName(gptKey.name)
    setPurpose(gptKey.purpose)
    setModel(gptKey.model)
    setNote(gptKey.note ?? '')
    setIsActive(gptKey.isActive)
    setRotateKey('')
    setRowMessage(null)
    setErrorMessage(null)
    setIsSaving(false)
    setIsRotating(false)
    setIsTesting(false)
  }, [gptKey])

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
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form className={styles.gptKeyRow} onSubmit={handleSubmit}>
      <label className={styles.fieldCell}>
        <span>이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <label className={styles.fieldCell}>
        <span>용도</span>
        <select value={purpose} onChange={(event) => setPurpose(event.target.value as AdminGptKeyPurpose)}>
          {GPT_KEY_PURPOSE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.fieldCell}>
        <span>모델</span>
        <input value={model} onChange={(event) => setModel(event.target.value)} maxLength={80} />
      </label>
      <div className={styles.identityCell}>
        <span>키</span>
        <strong>{gptKey.maskedKey}</strong>
      </div>
      <label className={styles.activeCell}>
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        <span>활성</span>
      </label>
      <div className={styles.statusCell}>
        <span className={`${styles.statusPill} ${styles[`status_${gptKey.lastTestStatus}`]}`}>
          {gptKeyTestStatusLabels[gptKey.lastTestStatus]}
        </span>
        <small>{formatUpdatedAt(gptKey.lastTestedAt)}</small>
      </div>
      <div className={styles.updatedCell}>{formatUpdatedAt(gptKey.dbUpdatedAt)}</div>
      <label className={`${styles.fieldCell} ${styles.gptKeySubField} ${styles.noteCell}`}>
        <span>메모</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
      </label>
      <div className={styles.gptKeyActionCell}>
        <input
          value={rotateKey}
          onChange={(event) => setRotateKey(event.target.value)}
          placeholder="새 키"
          autoComplete="off"
        />
        <button type="button" onClick={handleRotate} disabled={isRotating}>
          {isRotating ? '교체 중' : '키 교체'}
        </button>
        <button type="button" onClick={handleTest} disabled={isTesting}>
          {isTesting ? '테스트 중' : '연결 테스트'}
        </button>
        <button className={styles.saveButton} type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? '변경 중' : '변경'}
        </button>
      </div>
      {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
      {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}
    </form>
  )
}

export function AdminGptKeysPanel() {
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
        <span>테스트</span>
        <span>변경일</span>
      </div>

      {isLoading ? <div className={styles.emptyState}>GPT 키 목록 로딩 중</div> : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? (
        <div className={styles.userList}>
          {gptKeys.map((gptKey) => (
            <AdminGptKeyRow
              key={gptKey.uuid}
              gptKey={gptKey}
              onChanged={reloadGptKeys}
              onTested={handleTested}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

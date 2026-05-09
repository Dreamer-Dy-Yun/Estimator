import { useEffect, useState, type FormEvent } from 'react'
import {
  createAdminApiKey,
  getAdminApiKeys,
  rotateAdminApiKey,
  testAdminApiKey,
  updateAdminApiKey,
} from '../api'
import type {
  AdminApiKeyPurpose,
  AdminApiKeySummary,
  AdminApiKeyTestResult,
} from '../api'
import {
  API_KEY_PURPOSE_OPTIONS,
  apiKeyTestStatusLabels,
  formatUpdatedAt,
  getErrorMessage,
} from './adminHelpers'
import styles from './AdminPage.module.css'

function AdminApiKeyRow({
  apiKey,
  onChanged,
  onTested,
}: {
  apiKey: AdminApiKeySummary
  onChanged: () => Promise<void>
  onTested: (result: AdminApiKeyTestResult) => void
}) {
  const [name, setName] = useState(apiKey.name)
  const [purpose, setPurpose] = useState<AdminApiKeyPurpose>(apiKey.purpose)
  const [model, setModel] = useState(apiKey.model)
  const [note, setNote] = useState(apiKey.note ?? '')
  const [isActive, setIsActive] = useState(apiKey.isActive)
  const [rotateKey, setRotateKey] = useState('')
  const [rowMessage, setRowMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const isDirty =
    name !== apiKey.name ||
    purpose !== apiKey.purpose ||
    model !== apiKey.model ||
    note !== (apiKey.note ?? '') ||
    isActive !== apiKey.isActive

  useEffect(() => {
    setName(apiKey.name)
    setPurpose(apiKey.purpose)
    setModel(apiKey.model)
    setNote(apiKey.note ?? '')
    setIsActive(apiKey.isActive)
    setRotateKey('')
    setRowMessage(null)
    setErrorMessage(null)
    setIsSaving(false)
    setIsRotating(false)
    setIsTesting(false)
  }, [apiKey])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)

    try {
      await updateAdminApiKey({
        uuid: apiKey.uuid,
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
      await rotateAdminApiKey({ uuid: apiKey.uuid, plainKey: rotateKey })
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
      const result = await testAdminApiKey(apiKey.uuid)
      onTested(result)
      setRowMessage(result.message)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form className={styles.apiKeyRow} onSubmit={handleSubmit}>
      <label className={styles.fieldCell}>
        <span>이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <label className={styles.fieldCell}>
        <span>용도</span>
        <select value={purpose} onChange={(event) => setPurpose(event.target.value as AdminApiKeyPurpose)}>
          {API_KEY_PURPOSE_OPTIONS.map((option) => (
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
        <strong>{apiKey.maskedKey}</strong>
      </div>
      <label className={styles.activeCell}>
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        <span>활성</span>
      </label>
      <div className={styles.statusCell}>
        <span className={`${styles.statusPill} ${styles[`status_${apiKey.lastTestStatus}`]}`}>
          {apiKeyTestStatusLabels[apiKey.lastTestStatus]}
        </span>
        <small>{formatUpdatedAt(apiKey.lastTestedAt)}</small>
      </div>
      <div className={styles.updatedCell}>{formatUpdatedAt(apiKey.dbUpdatedAt)}</div>
      <label className={`${styles.fieldCell} ${styles.apiKeySubField} ${styles.noteCell}`}>
        <span>메모</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
      </label>
      <div className={styles.apiKeyActionCell}>
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

export function AdminApiKeysPanel() {
  const [apiKeys, setApiKeys] = useState<AdminApiKeySummary[]>([])
  const [newName, setNewName] = useState('')
  const [newPurpose, setNewPurpose] = useState<AdminApiKeyPurpose>('ai-comment')
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
    getAdminApiKeys()
      .then((nextApiKeys) => {
        if (alive) setApiKeys(nextApiKeys)
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

  const reloadApiKeys = async () => {
    const nextApiKeys = await getAdminApiKeys()
    setApiKeys(nextApiKeys)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setTestMessage(null)
    setIsCreating(true)

    try {
      await createAdminApiKey({
        name: newName,
        purpose: newPurpose,
        model: newModel,
        plainKey: newPlainKey,
        isActive: newIsActive,
        note: newNote,
      })
      await reloadApiKeys()
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

  const handleTested = (result: AdminApiKeyTestResult) => {
    setApiKeys((currentApiKeys) =>
      currentApiKeys.map((apiKey) =>
        apiKey.uuid === result.uuid
          ? {
              ...apiKey,
              lastTestStatus: result.status,
              lastTestedAt: result.testedAt,
              dbUpdatedAt: result.testedAt,
            }
          : apiKey,
      ),
    )
    setTestMessage(result.message)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>GPT 키</h2>
          <p>{apiKeys.length}개</p>
        </div>
        {testMessage ? <span className={styles.panelNotice}>{testMessage}</span> : null}
      </div>

      <form className={styles.apiKeyCreateForm} onSubmit={handleCreate}>
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
          <select value={newPurpose} onChange={(event) => setNewPurpose(event.target.value as AdminApiKeyPurpose)}>
            {API_KEY_PURPOSE_OPTIONS.map((option) => (
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
          <span>API 키</span>
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
        <label className={`${styles.createField} ${styles.apiKeyCreateNote}`}>
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

      <div className={styles.apiKeyTableHeader} aria-hidden="true">
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
          {apiKeys.map((apiKey) => (
            <AdminApiKeyRow
              key={apiKey.uuid}
              apiKey={apiKey}
              onChanged={reloadApiKeys}
              onTested={handleTested}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

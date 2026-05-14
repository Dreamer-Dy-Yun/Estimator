import { useEffect, useState, type FormEvent } from 'react'
import { createAdminGptKey, getAdminGptKeys } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type {
  AdminGptKeyPurpose,
  AdminGptKeySummary,
  AdminGptKeyTestResult,
} from '../api'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { GPT_KEY_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import { AdminGptKeyDialog } from './AdminGptKeyDialog'
import { AdminGptKeyRow } from './AdminGptKeyRow'
import styles from './AdminPage.module.css'

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
        <div className={styles.createActiveField}>
          <AdminActiveSwitch checked={newIsActive} onChange={setNewIsActive} />
        </div>
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
          {isCreating ? <LoadingSpinner size="inline" label="추가 중" /> : 'GPT 키 추가'}
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

      {isLoading ? (
        <div className={styles.emptyState}>
          <LoadingSpinner label="GPT 키 목록 로딩 중" />
        </div>
      ) : null}
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

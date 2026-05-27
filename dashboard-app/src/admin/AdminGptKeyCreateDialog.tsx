import { useState, type FormEvent } from 'react'
import { createAdminGptKey } from '../api'
import type { AdminGptKeyPurpose } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminCreateDialogShell } from './AdminCreateDialogShell'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { GPT_KEY_PURPOSE_OPTIONS, getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminGptKeyCreateDialogProps {
  onClose: () => void
  onCreated: () => Promise<void>
}

const formId = 'admin-gpt-key-create-form'

export function AdminGptKeyCreateDialog({ onClose, onCreated }: AdminGptKeyCreateDialogProps) {
  const { showToast } = useAppToast()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState<AdminGptKeyPurpose>('ai-comment')
  const [model, setModel] = useState('gpt-4.1-mini')
  const [plainKey, setPlainKey] = useState('')
  const [note, setNote] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsCreating(true)

    try {
      await createAdminGptKey({ name, purpose, model, plainKey, isActive, note })
      const refreshWarningMessage = await refreshAfterAdminMutation(onCreated)
      showToast('GPT 키를 추가했습니다.')
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AdminCreateDialogShell
      eyebrow="GPT 키 관리"
      title="GPT 키 추가"
      formId={formId}
      submitLabel="GPT 키 추가"
      submittingLabel="추가 중"
      isSubmitting={isCreating}
      errorMessage={errorMessage}
      onClose={onClose}
      onSubmit={handleCreate}
    >
      <label className={styles.createField}>
        <span>이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="GPT AI 코멘트" maxLength={80} />
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
      <div className={styles.createActiveField}>
        <AdminActiveSwitch checked={isActive} onChange={setIsActive} />
      </div>
      <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
        <span>GPT API 키</span>
        <input value={plainKey} onChange={(event) => setPlainKey(event.target.value)} placeholder="sk-..." autoComplete="off" />
      </label>
      <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
        <span>메모</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="용도나 발급 위치" maxLength={200} />
      </label>
    </AdminCreateDialogShell>
  )
}

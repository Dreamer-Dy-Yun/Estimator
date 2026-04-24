/**
 * 리스트 값만 제안하는 **공통** 콤보 입력(네이티브 `<datalist>` 아님).
 * 카드형과 맞춘 패널: `FilterListCombo.module.css` + body 포털 `position:fixed`.
 *
 * 사용처:
 * - `FilterBar`의 `kind: 'listCombo'`가 여기로 위임.
 * - 필터 바깥(단일 필드)에서도 동일 UI가 필요하면 이 컴포넌트만 import 해 `<label htmlFor={inputId}>`와 조합.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './FilterListCombo.module.css'

type PanelRect = { top: number; left: number; width: number }

type Props = {
  /** 바깥 `<label htmlFor>`와 동일 id */
  inputId: string
  value: string
  onChange: (next: string) => void
  /** 리스트에서만 온 고유값(부분 일치로 필터해 표시) */
  options: string[]
  inputType?: 'text' | 'date'
}

export function FilterListCombo({ inputId, value, onChange, options, inputType = 'text' }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, value])

  const updatePanelRect = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPanelRect({ top: r.bottom + 4, left: r.left, width: Math.max(160, r.width) })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null)
      return
    }
    updatePanelRect()
    const onReposition = () => updatePanelRect()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updatePanelRect, filtered.length, value])

  const close = useCallback(() => {
    setOpen(false)
    setActiveIdx(-1)
    setPanelRect(null)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      const el = wrapRef.current
      if (el?.contains(t)) return
      if ((e.target as HTMLElement | null)?.closest?.('[data-filter-combo-panel]')) return
      close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  const pick = useCallback(
    (v: string) => {
      onChange(v)
      close()
    },
    [onChange, close],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && filtered.length > 0) {
      setOpen(true)
      setActiveIdx(e.key === 'ArrowUp' ? filtered.length - 1 : 0)
      e.preventDefault()
      return
    }
    if (!open) return
    if (e.key === 'Escape') {
      close()
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx((i) => (filtered.length === 0 ? -1 : (i + 1) % filtered.length))
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowUp') {
      setActiveIdx((i) =>
        filtered.length === 0 ? -1 : (i <= 0 ? filtered.length - 1 : i - 1),
      )
      e.preventDefault()
      return
    }
    if (e.key === 'Enter' && activeIdx >= 0 && activeIdx < filtered.length) {
      pick(filtered[activeIdx]!)
      e.preventDefault()
    }
  }

  const showList = open && options.length > 0 && filtered.length > 0
  const showNoMatch = open && options.length > 0 && filtered.length === 0 && value.trim() !== ''

  const panelNode =
    panelRect && (showList || showNoMatch) ? (
      <div
        className={styles.panelFixed}
        data-filter-combo-panel
        style={{ top: panelRect.top, left: panelRect.left, width: panelRect.width }}
        role="presentation"
      >
        {showList ? (
          <ul className={styles.panelInner} role="listbox" id={`${inputId}-listbox`}>
            {filtered.map((opt, i) => (
              <li key={opt} role="presentation">
                <button
                  type="button"
                  id={`${inputId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`${styles.option} ${i === activeIdx ? styles.optionActive : ''}`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pick(opt)}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.panelInner}>
            <div className={styles.emptyHint}>목록에 일치하는 값이 없습니다.</div>
          </div>
        )}
      </div>
    ) : null

  const panelVisible = Boolean(showList || showNoMatch)

  return (
    <div
      className={`${styles.wrap} ${open && panelVisible ? styles.wrapOpen : ''}`}
      ref={wrapRef}
    >
      <input
        id={inputId}
        className={styles.input}
        type={inputType}
        autoComplete="off"
        aria-expanded={open && panelVisible}
        aria-controls={showList ? `${inputId}-listbox` : undefined}
        aria-activedescendant={showList && activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setActiveIdx(-1)
          if (options.length > 0) setOpen(true)
        }}
        onFocus={() => {
          if (options.length > 0) setOpen(true)
          setActiveIdx(-1)
        }}
        onKeyDown={onKeyDown}
      />
      <span className={styles.comboChevron} aria-hidden>
        <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
          <path
            d="M2.5 4.25L6 7.75L9.5 4.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {typeof document !== 'undefined' && panelNode ? createPortal(panelNode, document.body) : null}
    </div>
  )
}

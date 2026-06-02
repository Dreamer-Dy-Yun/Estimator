import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import styles from './FilterListCombo.module.css'

type PanelRect = { top: number; left: number; width: number }
type Props = {
  inputId: string
  value: string
  onChange: (next: string) => void
  options: string[]
  inputType?: 'text' | 'date'
  disabled?: boolean
}

const ALL_OPTION_LABEL = '전체'
const NO_MATCH_LABEL = '검색 결과가 없습니다.'
const isArrowOpenKey = (key: string) => key === 'ArrowDown' || key === 'ArrowUp'
const isAllOption = (option: string) => option.trim() === ALL_OPTION_LABEL

export function FilterListCombo({ inputId, value, onChange, options, inputType = 'text', disabled = false }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)
  const comboOpen = open && !disabled
  const valueIsAllOption = isAllOption(value)
  const filtered = useMemo(() => {
    if (disabled) return []
    const q = value.trim().toLowerCase()
    if (!q || q === ALL_OPTION_LABEL.toLowerCase()) return options

    const allOptions = options.filter(isAllOption)
    const matchedOptions = options.filter((option) => !isAllOption(option) && option.toLowerCase().includes(q))
    return [...allOptions, ...matchedOptions]
  }, [disabled, options, value])
  const showList = comboOpen && options.length > 0 && filtered.length > 0
  const showNoMatch = comboOpen
    && options.length > 0
    && value.trim() !== ''
    && value.trim().toLowerCase() !== ALL_OPTION_LABEL.toLowerCase()
    && filtered.every(isAllOption)
  const panelVisible = showList || showNoMatch

  const updatePanelRect = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setPanelRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(160, rect.width) })
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    setActiveIdx(-1)
    setPanelRect(null)
  }, [])
  const pick = useCallback((next: string) => {
    onChange(next)
    close()
  }, [close, onChange])
  const openOptions = useCallback(() => {
    if (disabled) return
    updatePanelRect()
    setOpen(options.length > 0)
    setActiveIdx(-1)
  }, [disabled, options.length, updatePanelRect])

  useLayoutEffect(() => {
    if (!comboOpen) return
    const frameId = window.requestAnimationFrame(updatePanelRect)
    window.addEventListener('resize', updatePanelRect)
    window.addEventListener('scroll', updatePanelRect, true)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updatePanelRect)
      window.removeEventListener('scroll', updatePanelRect, true)
    }
  }, [comboOpen, filtered.length, updatePanelRect, value])

  useEffect(() => {
    if (!comboOpen) return
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!wrapRef.current?.contains(target) && !(event.target as HTMLElement | null)?.closest?.('[data-filter-combo-panel]')) close()
    }
    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [close, comboOpen])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (!comboOpen && isArrowOpenKey(event.key) && filtered.length > 0) {
      updatePanelRect()
      setOpen(true)
      setActiveIdx(event.key === 'ArrowUp' ? filtered.length - 1 : 0)
      event.preventDefault()
      return
    }
    if (!comboOpen) return
    if (event.key === 'Escape') {
      close()
      event.preventDefault()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      setActiveIdx((idx) => (filtered.length === 0 ? -1 : event.key === 'ArrowDown' ? (idx + 1) % filtered.length : idx <= 0 ? filtered.length - 1 : idx - 1))
      event.preventDefault()
      return
    }
    if (event.key === 'Enter' && activeIdx >= 0 && activeIdx < filtered.length) {
      pick(filtered[activeIdx]!)
      event.preventDefault()
    }
  }

  const panelNode = panelRect && panelVisible ? (
    <div className={styles.panelFixed} data-filter-combo-panel style={{ top: panelRect.top, left: panelRect.left, width: panelRect.width }} role="presentation">
      {showList ? (
        <ul className={styles.panelInner} role="listbox" id={`${inputId}-listbox`}>
          {filtered.map((option, index) => (
            <li key={option} role="presentation">
              <button
                type="button"
                id={`${inputId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIdx}
                className={`${styles.option} ${isAllOption(option) ? styles.optionAll : ''} ${index === activeIdx ? styles.optionActive : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIdx(index)}
                onClick={() => pick(option)}
              >
                {option}
              </button>
            </li>
          ))}
          {showNoMatch ? <li className={styles.emptyHint} role="presentation" aria-live="polite">{NO_MATCH_LABEL}</li> : null}
        </ul>
      ) : <div className={styles.panelInner}><div className={styles.emptyHint}>{NO_MATCH_LABEL}</div></div>}
    </div>
  ) : null

  return (
    <div className={`${styles.wrap} ${comboOpen && panelVisible ? styles.wrapOpen : ''}`} ref={wrapRef}>
      <input
        id={inputId}
        className={styles.input}
        type={inputType}
        autoComplete="off"
        aria-expanded={comboOpen && panelVisible}
        aria-controls={showList ? `${inputId}-listbox` : undefined}
        aria-activedescendant={showList && activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (disabled) return
          const nextValue = valueIsAllOption
            ? event.target.value.replace(ALL_OPTION_LABEL, '')
            : event.target.value
          onChange(nextValue)
          updatePanelRect()
          setActiveIdx(-1)
          setOpen(options.length > 0)
        }}
        onFocus={(event) => {
          if (disabled) return
          if (valueIsAllOption && inputType === 'text') event.currentTarget.select()
          openOptions()
        }}
        onClick={openOptions}
        onKeyDown={onKeyDown}
      />
      <span className={styles.comboChevron} aria-hidden>
        <svg viewBox="0 0 12 12" width="12" height="12" focusable="false"><path d="M2.5 4.25L6 7.75L9.5 4.25" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {typeof document !== 'undefined' && panelNode ? createPortal(panelNode, document.body) : null}
    </div>
  )
}

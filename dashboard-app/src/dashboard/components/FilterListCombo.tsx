import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './FilterListCombo.module.css'

export type PanelRect = { top: number; left: number; width: number }
export type Props = {
  inputId: string
  value: string
  onChange: (next: string) => void
  options: string[]
  inputType?: 'text' | 'date'
  disabled?: boolean
}

const ALL_OPTION_LABEL = '전체' as const
const NO_MATCH_LABEL = '검색 결과가 없습니다.' as const
const isArrowOpenKey: (key: string) => key is 'ArrowDown' | 'ArrowUp' = (key: string) : key is 'ArrowDown' | 'ArrowUp' => key === 'ArrowDown' || key === 'ArrowUp'
const isAllOption: (option: string) => boolean = (option: string) : boolean => option.trim() === ALL_OPTION_LABEL

export function FilterListCombo({ inputId, value, onChange, options, inputType = 'text', disabled = false }: Props) : React.JSX.Element {
  const wrapRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const [open, setOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [activeIdx, setActiveIdx]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(-1)
  const [panelRect, setPanelRect]: [PanelRect | null, React.Dispatch<React.SetStateAction<PanelRect | null>>] = useState<PanelRect | null>(null)
  const comboOpen: boolean = open && !disabled
  const valueIsAllOption: boolean = isAllOption(value)
  const filtered: string[] = useMemo(() : string[] => {
    if (disabled) return []
    const q: string = value.trim().toLowerCase()
    if (!q || q === ALL_OPTION_LABEL.toLowerCase()) return options

    const allOptions: string[] = options.filter(isAllOption)
    const matchedOptions: string[] = options.filter((option: string) : boolean => !isAllOption(option) && option.toLowerCase().includes(q))
    return [...allOptions, ...matchedOptions]
  }, [disabled, options, value])
  const showList: boolean = comboOpen && options.length > 0 && filtered.length > 0
  const showNoMatch: boolean = comboOpen
    && options.length > 0
    && value.trim() !== ''
    && value.trim().toLowerCase() !== ALL_OPTION_LABEL.toLowerCase()
    && filtered.every(isAllOption)
  const panelVisible: boolean = showList || showNoMatch

  const updatePanelRect: () => void = useCallback(() : void => {
    const rect: DOMRect | undefined = wrapRef.current?.getBoundingClientRect()
    if (rect) setPanelRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(160, rect.width) })
  }, [])
  const close: () => void = useCallback(() : void => {
    setOpen(false)
    setActiveIdx(-1)
    setPanelRect(null)
  }, [])
  const pick: (next: string) => void = useCallback((next: string) : void => {
    onChange(next)
    close()
  }, [close, onChange])
  const openOptions: () => void = useCallback(() : void => {
    if (disabled) return
    updatePanelRect()
    setOpen(options.length > 0)
    setActiveIdx(-1)
  }, [disabled, options.length, updatePanelRect])

  useLayoutEffect(() : (() => void) | undefined => {
    if (!comboOpen) return
    const frameId: number = window.requestAnimationFrame(updatePanelRect)
    window.addEventListener('resize', updatePanelRect)
    window.addEventListener('scroll', updatePanelRect, true)
    return () : void => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updatePanelRect)
      window.removeEventListener('scroll', updatePanelRect, true)
    }
  }, [comboOpen, filtered.length, updatePanelRect, value])

  useEffect(() : (() => void) | undefined => {
    if (!comboOpen) return
    const onDocumentMouseDown: (event: MouseEvent) => void = (event: MouseEvent) : void => {
      const target: Node = event.target as Node
      if (!wrapRef.current?.contains(target) && !(event.target as HTMLElement | null)?.closest?.('[data-filter-combo-panel]')) close()
    }
    document.addEventListener('mousedown', onDocumentMouseDown)
    return () : void => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [close, comboOpen])

  const onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void = (event: React.KeyboardEvent<HTMLInputElement>) : void => {
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
      setActiveIdx((idx: number) : number => (filtered.length === 0 ? -1 : event.key === 'ArrowDown' ? (idx + 1) % filtered.length : idx <= 0 ? filtered.length - 1 : idx - 1))
      event.preventDefault()
      return
    }
    if (event.key === 'Enter' && activeIdx >= 0 && activeIdx < filtered.length) {
      pick(filtered[activeIdx]!)
      event.preventDefault()
    }
  }

  const panelNode: React.JSX.Element | null = panelRect && panelVisible ? (
    <div className={styles.panelFixed} data-filter-combo-panel style={{ top: panelRect.top, left: panelRect.left, width: panelRect.width }} role="presentation">
      {showList ? (
        <ul className={styles.panelInner} role="listbox" id={`${inputId}-listbox`}>
          {filtered.map((option: string, index: number) : React.JSX.Element => (
            <li key={option} role="presentation">
              <button
                type="button"
                id={`${inputId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIdx}
                className={`${styles.option} ${isAllOption(option) ? styles.optionAll : ''} ${index === activeIdx ? styles.optionActive : ''}`}
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) : void => event.preventDefault()}
                onMouseEnter={() : void => setActiveIdx(index)}
                onClick={() : void => pick(option)}
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
        onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => {
          if (disabled) return
          const nextValue: string = valueIsAllOption
            ? event.target.value.replace(ALL_OPTION_LABEL, '')
            : event.target.value
          onChange(nextValue)
          updatePanelRect()
          setActiveIdx(-1)
          setOpen(options.length > 0)
        }}
        onFocus={(event: React.FocusEvent<HTMLInputElement, Element>) : void => {
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

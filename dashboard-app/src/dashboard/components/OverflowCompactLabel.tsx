import { useLayoutEffect, useRef, useState } from 'react'
import styles from './OverflowCompactLabel.module.css'

const OVERFLOW_TOLERANCE_PX = 1 as const

type OverflowCompactLabelMode = 'full' | 'compact'

export interface OverflowCompactLabelProps {
  fullText: string
  compactText: string
  canCompact: boolean
}

export function OverflowCompactLabel({ fullText, compactText, canCompact }: OverflowCompactLabelProps): React.JSX.Element {
  const containerRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null)
  const measureRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null)
  const [mode, setMode]: [OverflowCompactLabelMode, React.Dispatch<React.SetStateAction<OverflowCompactLabelMode>>] = useState<OverflowCompactLabelMode>('full')
  const useCompact: boolean = canCompact && mode === 'compact'
  const visibleText: string = useCompact ? compactText : fullText

  useLayoutEffect((): (() => void) | undefined => {
    const container: HTMLSpanElement | null = containerRef.current
    const measure: HTMLSpanElement | null = measureRef.current
    if (!container || !measure || !canCompact) {
      return
    }

    let frameId: number | null = null
    const updateMode: () => void = (): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame((): void => {
        frameId = null
        const nextMode: OverflowCompactLabelMode = measure.scrollWidth > container.clientWidth + OVERFLOW_TOLERANCE_PX ? 'compact' : 'full'
        setMode((current: OverflowCompactLabelMode): OverflowCompactLabelMode => (current === nextMode ? current : nextMode))
      })
    }

    updateMode()
    const resizeObserver: ResizeObserver | null = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateMode)
    resizeObserver?.observe(container)
    resizeObserver?.observe(measure)
    return (): void => {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [canCompact, fullText])

  return (
    <span
      ref={containerRef}
      className={styles.root}
      title={useCompact ? fullText : undefined}
      aria-label={useCompact ? fullText : undefined}
    >
      <span ref={measureRef} className={styles.fullMeasure}>{fullText}</span>
      <span className={styles.visibleLabel}>{visibleText}</span>
    </span>
  )
}

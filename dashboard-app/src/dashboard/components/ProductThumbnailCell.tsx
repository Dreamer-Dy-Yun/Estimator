import { useCallback, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import styles from './ProductThumbnailCell.module.css'

export type ProductThumbnailCellSize = 'analysis' | 'candidate'

export type ProductThumbnailCellProps = {
  thumbnailUrl: string | null
  alt: string
  size?: ProductThumbnailCellSize
}

type ThumbnailPreviewPosition = {
  left: number
  top: number
}

const THUMBNAIL_PREVIEW_SIZE_PX = 184 as const
const THUMBNAIL_PREVIEW_GAP_PX = 12 as const

function calculateThumbnailPreviewPosition(rect: DOMRect, viewportWidth: number, viewportHeight: number): ThumbnailPreviewPosition {
  const preferredLeft: number = rect.right + THUMBNAIL_PREVIEW_GAP_PX
  const fallbackLeft: number = rect.left - THUMBNAIL_PREVIEW_GAP_PX - THUMBNAIL_PREVIEW_SIZE_PX
  const left: number = preferredLeft + THUMBNAIL_PREVIEW_SIZE_PX <= viewportWidth
    ? preferredLeft
    : Math.max(THUMBNAIL_PREVIEW_GAP_PX, fallbackLeft)
  const preferredTop: number = rect.top + (rect.height / 2) - (THUMBNAIL_PREVIEW_SIZE_PX / 2)
  const maxTop: number = Math.max(THUMBNAIL_PREVIEW_GAP_PX, viewportHeight - THUMBNAIL_PREVIEW_SIZE_PX - THUMBNAIL_PREVIEW_GAP_PX)
  const top: number = Math.min(Math.max(THUMBNAIL_PREVIEW_GAP_PX, preferredTop), maxTop)
  return { left, top }
}

export function ProductThumbnailCell({ thumbnailUrl, alt, size = 'analysis' }: ProductThumbnailCellProps) : React.JSX.Element {
  const cellRef: RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null)
  const [previewPosition, setPreviewPosition]: [ThumbnailPreviewPosition | null, React.Dispatch<React.SetStateAction<ThumbnailPreviewPosition | null>>] = useState<ThumbnailPreviewPosition | null>(null)
  const className: string = [styles.thumbnailCell, styles[size]].join(' ')
  const showPreview: () => void = useCallback(() : void => {
    const element: HTMLSpanElement | null = cellRef.current
    if (!element) return
    setPreviewPosition(calculateThumbnailPreviewPosition(element.getBoundingClientRect(), window.innerWidth, window.innerHeight))
  }, [])
  const hidePreview: () => void = useCallback(() : void => setPreviewPosition(null), [])
  const previewStyle: CSSProperties | undefined = previewPosition
    ? { left: previewPosition.left, top: previewPosition.top, width: THUMBNAIL_PREVIEW_SIZE_PX, height: THUMBNAIL_PREVIEW_SIZE_PX }
    : undefined
  const preview: React.JSX.Element | null = previewPosition
    ? (
        <span className={styles.preview} style={previewStyle} aria-hidden="true">
          {thumbnailUrl
            ? <img className={styles.previewImage} src={thumbnailUrl} alt="" decoding="async" />
            : <span className={styles.previewPlaceholder} />}
        </span>
      )
    : null

  return (
    <>
      <span ref={cellRef} className={className} onPointerEnter={showPreview} onPointerLeave={hidePreview}>
        {thumbnailUrl
          ? <img className={styles.image} src={thumbnailUrl} alt={alt} loading="lazy" decoding="async" />
          : <span className={styles.placeholder} role="img" aria-label="이미지 없음" />}
      </span>
      {preview ? createPortal(preview, document.body) : null}
    </>
  )
}
